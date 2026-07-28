import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema/index.js";
import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";
import { createReportingAgentDescriptor } from "./index.js";

const runIntegration = !!process.env.DATABASE_URL;

class CannedAudienceLLMClient implements LLMClient {
  async complete(): Promise<never> {
    throw new Error("not used");
  }
  async completeStructured<T>(req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
    if (req.schemaName === "AudienceSummary") {
      const data = { summary: "Overall risk is moderate given one high-severity finding.", keyRecommendations: ["Patch the API Gateway", "Enable MFA"] };
      return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
    }
    throw new Error(`Unexpected schemaName: ${req.schemaName}`);
  }
}

describe.skipIf(!runIntegration)("reporting agent (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let reportsDir: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    reportsDir = await mkdtemp(path.join(tmpdir(), "reports-"));
  });

  afterAll(async () => {
    await pool.end();
    await rm(reportsDir, { recursive: true, force: true });
  });

  it("produces all report artifacts and three audience reports for a fully-populated run", async () => {
    const [project] = await db.insert(schema.projects).values({ name: "Reporting e2e test" }).returning();
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id, framework: "enterprise" }).returning();
    const [systemModel] = await db.insert(schema.systemModels).values({ runId: run!.id }).returning();

    const [api] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "API Gateway", type: "process", description: "", technologies: [], sourceRefs: [] })
      .returning();

    const [attackPath] = await db
      .insert(schema.attackPaths)
      .values({
        systemModelId: systemModel!.id,
        name: "Unauthenticated ingress",
        sourcePass: "rule-pack",
        strideCategories: ["spoofing"],
        entities: [{ componentId: api!.id, role: "target" }],
        killChainStages: ["Initial Access"],
        groupKey: "gk-report-1",
        groundingRefs: [{ techniqueId: "T1190", framework: "enterprise", chunkId: "chunk1", retrievalScore: 1 }],
        applicability: "applicable",
      })
      .returning();

    await db.insert(schema.riskScores).values({
      attackPathId: attackPath!.id,
      likelihood: 0.8,
      impact: 0.7,
      baseScore: 56,
      criAdjustment: { function: "protect", maturityTier: "baseline", modifier: 0.2, rationale: "Low maturity." },
      score: 67,
      rank: 1,
      heatmapCell: "high-high",
      rationale: "High exposure, sensitive data.",
    });
    await db.insert(schema.mitigationRecommendations).values({
      systemModelId: systemModel!.id,
      attackPathIds: [attackPath!.id],
      controlFamily: "Identification and Authentication",
      title: "Require API authentication",
      description: "Enforce OAuth2 on the API Gateway.",
      priority: "high",
    });
    await db.insert(schema.validationFindings).values({
      systemModelId: systemModel!.id,
      ruleId: "entity-anchoring",
      category: "entity-anchoring",
      targetId: attackPath!.id,
      passed: true,
      message: "OK",
    });
    await db.insert(schema.coverageCriticResults).values({
      systemModelId: systemModel!.id,
      framework: "enterprise",
      techniquesCovered: ["T1190"],
      techniquesUnaddressed: ["T1566"],
      coveragePercent: 50,
    });
    await db.insert(schema.pivotNodeFindings).values({
      systemModelId: systemModel!.id,
      componentId: api!.id,
      attackPathCount: 3,
      trustBoundaryCrossingCount: 1,
      linkedMitigationIds: [],
    });

    const descriptor = createReportingAgentDescriptor({ db, llmClient: new CannedAudienceLLMClient(), reportsDir });
    const result = await descriptor.handler({ runId: run!.id });
    expect(result.outputRefs.some((r) => r.startsWith("report_artifact:"))).toBe(true);
    expect(result.outputRefs.filter((r) => r.startsWith("report:"))).toHaveLength(3);

    const [artifact] = await db.select().from(schema.reportArtifacts).where(eq(schema.reportArtifacts.runId, run!.id)).limit(1);
    expect(artifact).toBeDefined();
    expect(artifact!.threatModelMarkdown).toContain("Reporting e2e test");
    expect(artifact!.threatModelMarkdown).toContain("Unauthenticated ingress");
    expect(artifact!.confidence).toBeGreaterThan(0);
    expect(artifact!.confidence).toBeLessThanOrEqual(100);

    const navigatorLayer = artifact!.navigatorLayer as { techniques: { techniqueID: string }[] };
    expect(navigatorLayer.techniques.some((t) => t.techniqueID === "T1190")).toBe(true);

    expect(artifact!.riskRegisterCsv).toContain("Unauthenticated ingress");

    expect(artifact!.pdfPath).toBeDefined();
    const pdfStats = await stat(artifact!.pdfPath!);
    expect(pdfStats.size).toBeGreaterThan(1000);

    const audienceReports = await db.select().from(schema.reports).where(eq(schema.reports.runId, run!.id));
    expect(audienceReports.map((r) => r.audience).sort()).toEqual(["ciso", "executive", "technical"]);
    for (const report of audienceReports) {
      expect(report.confidence).toBe(artifact!.confidence);
    }
    const executiveReport = audienceReports.find((r) => r.audience === "executive")!;
    expect(executiveReport.markdown).toContain("Patch the API Gateway");
  }, 30_000);
});
