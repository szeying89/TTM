import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import { clearRegistry, getRegistry, registerAgent } from "../agents/registry.js";
import { createArchitectAgentDescriptor } from "../agents/architect/index.js";
import { createThreatAgentDescriptor } from "../agents/threat/index.js";
import { createRiskAgentDescriptor } from "../agents/risk/index.js";
import { createMitigationAgentDescriptor } from "../agents/mitigation/index.js";
import { createDesignEnrichAgentDescriptor } from "../agents/design-enrich/index.js";
import { DrizzlePipelineStepsLedger } from "./drizzle-ledger.js";
import { runPipeline } from "./runPipeline.js";
import { oneHotVector } from "../test-utils/vector-fixtures.js";

const runIntegration = !!process.env.DATABASE_URL;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class FixedEmbeddingClient implements EmbeddingClient {
  readonly dimensions = 1024;
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => oneHotVector(9));
  }
}

function makeAllAgentsMockLLMClient(delayedSchemas: Set<string>): LLMClient {
  return {
    async complete(): Promise<never> {
      throw new Error("not used");
    },
    async completeStructured<T>(req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
      if (delayedSchemas.has(req.schemaName)) await delay(60);

      switch (req.schemaName) {
        case "ArchitectOutput": {
          const data = {
            components: [
              { id: "browser", name: "Browser", type: "actor", description: "User browser", technologies: [], trustBoundaryId: "public", sourceRefs: ["x"] },
              { id: "api", name: "API", type: "process", description: "Public API", technologies: [], trustBoundaryId: "public", sourceRefs: ["x"] },
            ],
            dataflows: [
              { id: "df1", name: "Browser to API", sourceComponentId: "browser", targetComponentId: "api", crossesTrustBoundaryIds: [] },
            ],
            trustBoundaries: [{ id: "public", name: "Public tier", componentIds: [] }],
          };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        case "StrideGeneratorOutput": {
          const data = { attackPaths: [] };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        case "OtherThreatsOutput": {
          const data = { decisions: [] };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        case "RiskRationaleOutput": {
          const data = { rationales: [] };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        case "MitigationOutput": {
          const data = { recommendations: [] };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        case "DesignEnrichOutput": {
          const data = { assumptions: [], designDeltas: [] };
          return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
        }
        default:
          throw new Error(`Unexpected schemaName in test mock: ${req.schemaName}`);
      }
    },
  };
}

describe.skipIf(!runIntegration)("Mitigation + Design-Enrich concurrency (full pipeline integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(() => clearRegistry());
  afterEach(() => clearRegistry());

  it("runs mitigation and design-enrich concurrently, in the same wave, as part of a real 5-agent pipeline", async () => {
    const llmClient = makeAllAgentsMockLLMClient(new Set(["MitigationOutput", "DesignEnrichOutput"]));
    const embeddingClient = new FixedEmbeddingClient();

    registerAgent(createArchitectAgentDescriptor({ db, llmClient }));
    registerAgent(createThreatAgentDescriptor({ db, llmClient, embeddingClient }));
    registerAgent(createRiskAgentDescriptor({ db, llmClient }));
    registerAgent(createMitigationAgentDescriptor({ db, llmClient }));
    registerAgent(createDesignEnrichAgentDescriptor({ db, llmClient }));

    const [project] = await db.insert(schema.projects).values({ name: "Concurrency test project" }).returning();
    await db.insert(schema.designDocs).values({
      projectId: project!.id,
      prose: "A simple browser-to-API system.",
      mermaidText: "flowchart TD\nBrowser --> API",
    });
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id, framework: "enterprise" }).returning();

    const ledger = new DrizzlePipelineStepsLedger(db);
    const result = await runPipeline({ runId: run!.id, agents: getRegistry(), ledger });

    expect(result.finalStatuses.architect).toBe("succeeded");
    expect(result.finalStatuses.threat).toBe("succeeded");
    expect(result.finalStatuses.risk).toBe("succeeded");
    expect(result.finalStatuses.mitigation).toBe("succeeded");
    expect(result.finalStatuses["design-enrich"]).toBe("succeeded");

    const steps = await ledger.listSteps(run!.id);
    const mitigationStep = steps.find((s) => s.agentName === "mitigation")!;
    const designEnrichStep = steps.find((s) => s.agentName === "design-enrich")!;

    expect(mitigationStep.wave).toBe(designEnrichStep.wave);

    const mitigationStart = new Date(mitigationStep.startedAt!).getTime();
    const mitigationEnd = new Date(mitigationStep.finishedAt!).getTime();
    const designEnrichStart = new Date(designEnrichStep.startedAt!).getTime();
    const designEnrichEnd = new Date(designEnrichStep.finishedAt!).getTime();

    const overlap = Math.min(mitigationEnd, designEnrichEnd) - Math.max(mitigationStart, designEnrichStart);
    expect(overlap).toBeGreaterThan(0);
  });

  it("persists mitigations and assumptions that reference only real attack-path/component ids", async () => {
    const llmClient: LLMClient = {
      async complete(): Promise<never> {
        throw new Error("not used");
      },
      async completeStructured<T>(req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
        switch (req.schemaName) {
          case "ArchitectOutput": {
            const data = {
              components: [
                { id: "browser", name: "Browser", type: "actor", description: "User browser", technologies: [], trustBoundaryId: undefined, sourceRefs: ["x"] },
                { id: "api", name: "API", type: "process", description: "Public API", technologies: [], trustBoundaryId: undefined, sourceRefs: ["x"] },
              ],
              dataflows: [{ id: "df1", name: "Browser to API", sourceComponentId: "browser", targetComponentId: "api", crossesTrustBoundaryIds: [] }],
              trustBoundaries: [],
            };
            return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
          }
          case "StrideGeneratorOutput":
            return { data: { attackPaths: [] } as T, usage: { inputTokens: 0, outputTokens: 0 } };
          case "OtherThreatsOutput":
            return { data: { decisions: [] } as T, usage: { inputTokens: 0, outputTokens: 0 } };
          case "RiskRationaleOutput":
            return { data: { rationales: [] } as T, usage: { inputTokens: 0, outputTokens: 0 } };
          case "MitigationOutput":
            return { data: { recommendations: [] } as T, usage: { inputTokens: 0, outputTokens: 0 } };
          case "DesignEnrichOutput": {
            const data = {
              assumptions: [
                { statement: "Browser is untrusted.", relatedComponentIds: ["browser", "totally-fake-id"], source: "inferred" },
              ],
              designDeltas: [],
            };
            return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
          }
          default:
            throw new Error(`Unexpected schemaName: ${req.schemaName}`);
        }
      },
    };
    const embeddingClient = new FixedEmbeddingClient();

    registerAgent(createArchitectAgentDescriptor({ db, llmClient }));
    registerAgent(createThreatAgentDescriptor({ db, llmClient, embeddingClient }));
    registerAgent(createRiskAgentDescriptor({ db, llmClient }));
    registerAgent(createMitigationAgentDescriptor({ db, llmClient }));
    registerAgent(createDesignEnrichAgentDescriptor({ db, llmClient }));

    const [project] = await db.insert(schema.projects).values({ name: "Validity test project" }).returning();
    await db.insert(schema.designDocs).values({
      projectId: project!.id,
      prose: "A simple browser-to-API system.",
      mermaidText: "flowchart TD\nBrowser --> API",
    });
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id, framework: "enterprise" }).returning();

    const ledger = new DrizzlePipelineStepsLedger(db);
    await runPipeline({ runId: run!.id, agents: getRegistry(), ledger });

    const [systemModel] = await db.select().from(schema.systemModels).where(eq(schema.systemModels.runId, run!.id)).limit(1);
    const persistedAssumptions = await db
      .select()
      .from(schema.assumptions)
      .where(eq(schema.assumptions.systemModelId, systemModel!.id));

    expect(persistedAssumptions).toHaveLength(1);
    expect(persistedAssumptions[0]?.relatedComponentIds).toEqual(
      persistedAssumptions[0]?.relatedComponentIds.filter((id) => id !== "totally-fake-id"),
    );
  });
});
