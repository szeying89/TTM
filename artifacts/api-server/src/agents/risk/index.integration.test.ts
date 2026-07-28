import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema/index.js";
import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";
import { createRiskAgentDescriptor } from "./index.js";

const runIntegration = !!process.env.DATABASE_URL;

class EmptyRationaleLLMClient implements LLMClient {
  async complete(): Promise<never> {
    throw new Error("not used");
  }
  async completeStructured<T>(_req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
    return { data: { rationales: [] } as T, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

describe.skipIf(!runIntegration)("risk agent (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("ranks a high-exposure attack path above a low-exposure one and applies CRI + intel adjustments", async () => {
    const [project] = await db
      .insert(schema.projects)
      .values({ name: "Risk agent e2e test", criMaturity: { protect: "baseline" } })
      .returning();
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id, framework: "enterprise" }).returning();
    const [systemModel] = await db.insert(schema.systemModels).values({ runId: run!.id }).returning();

    const [attacker] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "Attacker", type: "external_entity", description: "", technologies: [], sourceRefs: [] })
      .returning();
    const [api] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "API", type: "process", description: "", technologies: [], sourceRefs: [] })
      .returning();
    const [svcA] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "Internal A", type: "process", description: "", technologies: [], sourceRefs: [] })
      .returning();
    const [svcB] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "Internal B", type: "process", description: "", technologies: [], sourceRefs: [] })
      .returning();

    const [highRiskPath] = await db
      .insert(schema.attackPaths)
      .values({
        systemModelId: systemModel!.id,
        name: "External spoofing of API",
        sourcePass: "rule-pack",
        strideCategories: ["spoofing"],
        entities: [
          { componentId: attacker!.id, role: "source" },
          { componentId: api!.id, role: "target" },
        ],
        killChainStages: ["Initial Access"],
        groupKey: "gk-high",
        groundingRefs: [{ techniqueId: "T1190", framework: "enterprise", chunkId: "chunk1", retrievalScore: 1 }],
        applicability: "applicable",
      })
      .returning();

    const [lowRiskPath] = await db
      .insert(schema.attackPaths)
      .values({
        systemModelId: systemModel!.id,
        name: "Internal lateral movement",
        sourcePass: "rule-pack",
        strideCategories: ["elevation-of-privilege"],
        entities: [
          { componentId: svcA!.id, role: "source" },
          { componentId: svcB!.id, role: "target" },
        ],
        killChainStages: ["Impact"],
        groupKey: "gk-low",
        groundingRefs: [{ techniqueId: "T1499", framework: "enterprise", chunkId: "chunk2", retrievalScore: 1 }],
        applicability: "applicable",
      })
      .returning();

    const [feedItem] = await db
      .insert(schema.intelFeedItems)
      .values({ projectId: project!.id, sourceType: "url", sourceRef: "https://example.com/x", status: "processed" })
      .returning();
    await db.insert(schema.intelSignals).values({
      intelFeedItemId: feedItem!.id,
      signalType: "active-exploitation",
      relatedTechniqueIds: [{ techniqueId: "T1190", framework: "enterprise" }],
      relatedComponentIds: [],
      severity: 1,
      summary: "Active exploitation observed for T1190.",
      confidence: 0.9,
    });

    const descriptor = createRiskAgentDescriptor({ db, llmClient: new EmptyRationaleLLMClient() });
    const result = await descriptor.handler({ runId: run!.id });
    expect(result.outputRefs).toHaveLength(2);

    const scores = await db.select().from(schema.riskScores);
    const highScore = scores.find((s) => s.attackPathId === highRiskPath!.id)!;
    const lowScore = scores.find((s) => s.attackPathId === lowRiskPath!.id)!;

    expect(highScore.score).toBeGreaterThan(lowScore.score);
    expect(highScore.rank).toBe(1);
    expect(lowScore.rank).toBe(2);
    expect(highScore.criAdjustment).toMatchObject({ function: "protect", maturityTier: "baseline" });
    expect(highScore.intelAdjustment).toBeDefined();
    expect(highScore.intelAdjustment?.intelSignalIds.length).toBeGreaterThan(0);
    expect(highScore.rationale.length).toBeGreaterThan(0);
    expect(lowScore.rationale.length).toBeGreaterThan(0);
  });
});
