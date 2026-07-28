import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema/index.js";
import { computeCoverageCritic } from "./coverage-critic.js";
import { oneHotVector } from "../../test-utils/vector-fixtures.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("computeCoverageCritic (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    for (const techniqueId of ["T-COV-1", "T-COV-2", "T-COV-3", "T-COV-4"]) {
      await db.insert(schema.techniqueChunks).values({
        techniqueId,
        framework: "enterprise",
        name: techniqueId,
        tactic: "Initial Access",
        chunkType: "description",
        chunkText: "fixture",
        embedding: oneHotVector(4),
        contentHash: `cov-${techniqueId}-${Math.random()}`,
      });
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("computes coverage percent from techniques addressed by any attack path, applicable or not", async () => {
    const attackPaths = [
      {
        id: "ap1",
        entities: [],
        groundingRefs: [{ techniqueId: "T-COV-1", framework: "enterprise", chunkId: "c1", retrievalScore: 1 }],
        groupKey: "gk1",
        applicability: "applicable",
        notApplicableRationale: null,
      },
      {
        id: "ap2",
        entities: [],
        groundingRefs: [{ techniqueId: "T-COV-2", framework: "enterprise", chunkId: "c2", retrievalScore: 1 }],
        groupKey: "gk2",
        applicability: "not-applicable",
        notApplicableRationale: "Out of scope for this deployment.",
      },
    ];

    const result = await computeCoverageCritic(db, "enterprise", attackPaths);

    expect(result.techniquesCovered.sort()).toEqual(["T-COV-1", "T-COV-2"]);
    expect(result.techniquesUnaddressed).toEqual(expect.arrayContaining(["T-COV-3", "T-COV-4"]));
    expect(result.coveragePercent).toBeGreaterThan(0);
    expect(result.coveragePercent).toBeLessThanOrEqual(100);
  });
});
