import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { FastifyInstance } from "fastify";
import * as schema from "../db/schema/index.js";
import { buildApp } from "../app.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("pipeline-run-data routes (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let app: FastifyInstance;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    app = await buildApp({ db });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it("returns the system model, attack paths with risk, and mitigations for a run", async () => {
    const [project] = await db.insert(schema.projects).values({ name: "Route data test" }).returning();
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id, framework: "enterprise" }).returning();
    const [systemModel] = await db.insert(schema.systemModels).values({ runId: run!.id }).returning();
    const [component] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "API", type: "process", description: "", technologies: [], sourceRefs: [] })
      .returning();
    const [attackPath] = await db
      .insert(schema.attackPaths)
      .values({
        systemModelId: systemModel!.id,
        name: "Test path",
        sourcePass: "rule-pack",
        strideCategories: ["spoofing"],
        entities: [{ componentId: component!.id, role: "target" }],
        killChainStages: [],
        groupKey: "gk-route-test",
        groundingRefs: [],
        applicability: "applicable",
      })
      .returning();
    await db.insert(schema.riskScores).values({
      attackPathId: attackPath!.id,
      likelihood: 0.5,
      impact: 0.5,
      baseScore: 25,
      criAdjustment: { function: "protect", maturityTier: "not-assessed", modifier: 0.15, rationale: "x" },
      score: 29,
      rank: 1,
      heatmapCell: "medium-medium",
      rationale: "x",
    });
    await db.insert(schema.mitigationRecommendations).values({
      systemModelId: systemModel!.id,
      attackPathIds: [attackPath!.id],
      controlFamily: "Access Control",
      title: "Restrict access",
      description: "x",
      priority: "medium",
    });

    const systemModelResponse = await app.inject({ method: "GET", url: `/pipeline-runs/${run!.id}/system-model` });
    expect(systemModelResponse.statusCode).toBe(200);
    expect(systemModelResponse.json().components).toHaveLength(1);

    const attackPathsResponse = await app.inject({ method: "GET", url: `/pipeline-runs/${run!.id}/attack-paths` });
    expect(attackPathsResponse.statusCode).toBe(200);
    const paths = attackPathsResponse.json();
    expect(paths).toHaveLength(1);
    expect(paths[0].risk.score).toBe(29);

    const mitigationsResponse = await app.inject({ method: "GET", url: `/pipeline-runs/${run!.id}/mitigations` });
    expect(mitigationsResponse.statusCode).toBe(200);
    expect(mitigationsResponse.json()).toHaveLength(1);
  });

  it("404s report-artifacts and report.pdf when no report has been generated yet", async () => {
    const [project] = await db.insert(schema.projects).values({ name: "No report test" }).returning();
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id, framework: "enterprise" }).returning();

    const artifactsResponse = await app.inject({ method: "GET", url: `/pipeline-runs/${run!.id}/report-artifacts` });
    expect(artifactsResponse.statusCode).toBe(404);

    const pdfResponse = await app.inject({ method: "GET", url: `/pipeline-runs/${run!.id}/report.pdf` });
    expect(pdfResponse.statusCode).toBe(404);
  });

  it("allows updating a project's CRI maturity via PATCH", async () => {
    const createResponse = await app.inject({ method: "POST", url: "/projects", payload: { name: "Patch test" } });
    const project = createResponse.json();

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/projects/${project.id}`,
      payload: { criMaturity: { protect: "baseline", detect: "advanced" } },
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().criMaturity).toEqual({ protect: "baseline", detect: "advanced" });
  });

  it("lists all projects", async () => {
    const response = await app.inject({ method: "GET", url: "/projects" });
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json())).toBe(true);
  });
});
