import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema/index.js";
import { createValidationAgentDescriptor } from "./index.js";
import { oneHotVector } from "../../test-utils/vector-fixtures.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("validation agent (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    await db.insert(schema.techniqueChunks).values({
      techniqueId: "T-VAL-1",
      framework: "enterprise",
      name: "Test technique",
      tactic: "Initial Access",
      chunkType: "description",
      chunkText: "fixture",
      embedding: oneHotVector(5),
      contentHash: `val-${Math.random()}`,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("runs all invariant checks, coverage critic, and pivot-node detection against a real chain", async () => {
    const [project] = await db.insert(schema.projects).values({ name: "Validation e2e test" }).returning();
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id, framework: "enterprise" }).returning();
    const [systemModel] = await db.insert(schema.systemModels).values({ runId: run!.id }).returning();

    const [browser] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "Browser", type: "actor", description: "", technologies: [], sourceRefs: [] })
      .returning();
    const [api] = await db
      .insert(schema.components)
      .values({ systemModelId: systemModel!.id, name: "API", type: "process", description: "", technologies: [], sourceRefs: [] })
      .returning();

    const [validPath] = await db
      .insert(schema.attackPaths)
      .values({
        systemModelId: systemModel!.id,
        name: "Valid path",
        sourcePass: "rule-pack",
        strideCategories: ["spoofing"],
        entities: [{ componentId: browser!.id, role: "source" }, { componentId: api!.id, role: "target" }],
        killChainStages: [],
        groupKey: "gk-valid",
        groundingRefs: [{ techniqueId: "T-VAL-1", framework: "enterprise", chunkId: "c1", retrievalScore: 1 }],
        applicability: "applicable",
      })
      .returning();

    // A dangling-entity path (references a component id that doesn't exist)
    // to prove entity-anchoring actually fails when it should.
    await db.insert(schema.attackPaths).values({
      systemModelId: systemModel!.id,
      name: "Dangling entity path",
      sourcePass: "other-threats",
      strideCategories: ["tampering"],
      entities: [{ componentId: "00000000-0000-0000-0000-000000000000", role: "target" }],
      killChainStages: [],
      groupKey: "gk-dangling",
      groundingRefs: [{ techniqueId: "T-VAL-1", framework: "enterprise", chunkId: "c1", retrievalScore: 1 }],
      applicability: "applicable",
    });

    // A not-applicable path with an insufficient rationale.
    await db.insert(schema.attackPaths).values({
      systemModelId: systemModel!.id,
      name: "Weak rationale path",
      sourcePass: "other-threats",
      strideCategories: ["information-disclosure"],
      entities: [{ componentId: api!.id, role: "target" }],
      killChainStages: [],
      groupKey: "gk-weak",
      groundingRefs: [{ techniqueId: "T-VAL-1", framework: "enterprise", chunkId: "c1", retrievalScore: 1 }],
      applicability: "not-applicable",
      notApplicableRationale: "N/A",
    });

    const descriptor = createValidationAgentDescriptor({ db });
    const result = await descriptor.handler({ runId: run!.id });
    expect(result.outputRefs.length).toBeGreaterThan(0);

    const findings = await db
      .select()
      .from(schema.validationFindings)
      .where(eq(schema.validationFindings.systemModelId, systemModel!.id));

    const anchoringForValidPath = findings.find((f) => f.category === "entity-anchoring" && f.targetId === validPath!.id);
    expect(anchoringForValidPath?.passed).toBe(true);

    const anchoringFailures = findings.filter((f) => f.category === "entity-anchoring" && !f.passed);
    expect(anchoringFailures.length).toBeGreaterThan(0);

    const rationaleFailures = findings.filter((f) => f.category === "not-applicable-rationale" && !f.passed);
    expect(rationaleFailures.length).toBeGreaterThan(0);

    const coverage = await db
      .select()
      .from(schema.coverageCriticResults)
      .where(eq(schema.coverageCriticResults.systemModelId, systemModel!.id));
    expect(coverage).toHaveLength(1);
    expect(coverage[0]?.techniquesCovered).toContain("T-VAL-1");
  });
});
