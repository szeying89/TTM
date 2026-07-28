import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../../db/schema/index.js";
import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import { createThreatAgentDescriptor } from "./index.js";
import { oneHotVector } from "../../test-utils/vector-fixtures.js";

const runIntegration = !!process.env.DATABASE_URL;

class FixedEmbeddingClient implements EmbeddingClient {
  readonly dimensions = 1024;
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => oneHotVector(2));
  }
}

describe.skipIf(!runIntegration)("threat agent (integration, mocked LLM + embeddings)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const chunkIds: Record<string, string> = {};

  const seedChunk = async (techniqueId: string, name: string, chunkText: string) => {
    const [row] = await db
      .insert(schema.techniqueChunks)
      .values({
        techniqueId,
        framework: "enterprise",
        name,
        tactic: "Initial Access",
        chunkType: "description",
        chunkText,
        embedding: oneHotVector(2),
        contentHash: `test-${techniqueId}-${Math.random()}`,
      })
      .returning();
    chunkIds[techniqueId] = row!.id;
  };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    await seedChunk("T1557", "Adversary-in-the-Middle", "AiTM technique fixture text.");
    await seedChunk("T1566", "Phishing", "Phishing technique fixture text.");
    await seedChunk("T1499", "Endpoint Denial of Service", "DoS technique fixture text.");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("produces attack paths whose grounding refs all resolve to real technique_chunks rows, with non-empty rationale on every not-applicable entry", async () => {
    const [project] = await db.insert(schema.projects).values({ name: "Threat agent e2e test" }).returning();
    const [run] = await db
      .insert(schema.pipelineRuns)
      .values({ projectId: project!.id, framework: "enterprise" })
      .returning();
    const [systemModel] = await db.insert(schema.systemModels).values({ runId: run!.id }).returning();

    const [browser] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "Browser", type: "actor", description: "End user browser", technologies: [], sourceRefs: [] })
      .returning();
    const [api] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "API Gateway", type: "process", description: "Public API handling requests", technologies: ["REST"], sourceRefs: [] })
      .returning();
    const [tb] = await db
      .insert(schema.trustBoundaries)
      .values({ systemModelId: systemModel!.id, name: "Internal", componentIds: [api!.id] })
      .returning();
    await db.update(schema.components).set({ trustBoundaryId: tb!.id }).where(eq(schema.components.id, api!.id));
    await db.insert(schema.dataflows).values({
      systemModelId: systemModel!.id,
      name: "Browser to API",
      sourceComponentId: browser!.id,
      targetComponentId: api!.id,
      protocol: "HTTP",
      crossesTrustBoundaryIds: [tb!.id],
    });

    class MockLLMClient implements LLMClient {
      async complete(): Promise<never> {
        throw new Error("not used");
      }
      async completeStructured<T>(req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
        if (req.schemaName === "StrideGeneratorOutput") {
          const data = {
            attackPaths: [
              {
                name: "Phishing against Browser user",
                strideCategories: ["spoofing"],
                entities: [{ componentId: browser!.id, role: "target" }],
                killChainStages: ["Initial Access"],
                groundingRefs: [{ techniqueId: "T1566", chunkId: chunkIds.T1566 }],
              },
            ],
          };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        if (req.schemaName === "OtherThreatsOutput") {
          const data = {
            decisions: [
              {
                chunkId: chunkIds.T1499,
                decision: "not-applicable",
                name: "Endpoint DoS against API Gateway",
                strideCategories: ["denial-of-service"],
                entities: [{ componentId: api!.id, role: "target" }],
                killChainStages: [],
                notApplicableRationaleCategory: "mitigated-by-design",
                notApplicableRationale: "The API Gateway sits behind managed rate limiting, so this technique is judged out of scope.",
              },
            ],
          };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        throw new Error(`Unexpected schemaName: ${req.schemaName}`);
      }
    }

    const descriptor = createThreatAgentDescriptor({
      db,
      llmClient: new MockLLMClient(),
      embeddingClient: new FixedEmbeddingClient(),
    });

    const result = await descriptor.handler({ runId: run!.id });
    expect(result.outputRefs.length).toBeGreaterThan(0);

    const persisted = await db
      .select()
      .from(schema.attackPaths)
      .where(eq(schema.attackPaths.systemModelId, systemModel!.id));
    expect(persisted.length).toBeGreaterThan(0);

    const allChunkIds = persisted.flatMap((p) => p.groundingRefs.map((r) => r.chunkId));
    expect(allChunkIds.length).toBeGreaterThan(0);
    const resolvedChunks = await db
      .select({ id: schema.techniqueChunks.id })
      .from(schema.techniqueChunks)
      .where(inArray(schema.techniqueChunks.id, allChunkIds));
    expect(resolvedChunks.map((c) => c.id).sort()).toEqual(Array.from(new Set(allChunkIds)).sort());

    const notApplicableRows = persisted.filter((p) => p.applicability === "not-applicable");
    expect(notApplicableRows.length).toBeGreaterThan(0);
    for (const row of notApplicableRows) {
      expect(row.notApplicableRationale?.trim()).toBeTruthy();
    }

    const rulePackRows = persisted.filter((p) => p.sourcePass === "rule-pack");
    expect(rulePackRows.length).toBeGreaterThan(0);
  });
});
