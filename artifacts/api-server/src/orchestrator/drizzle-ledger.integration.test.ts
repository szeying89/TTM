import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema/index.js";
import { pipelineRuns } from "../db/schema/pipeline.js";
import { DrizzlePipelineStepsLedger } from "./drizzle-ledger.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("DrizzlePipelineStepsLedger (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let ledger: DrizzlePipelineStepsLedger;
  let runId: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    ledger = new DrizzlePipelineStepsLedger(db);
    const [run] = await db.insert(pipelineRuns).values({ projectId: "00000000-0000-0000-0000-000000000000" }).returning();
    runId = run!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("takes a step through the full pending -> running -> succeeded lifecycle", async () => {
    const step = await ledger.createStep({ runId, agentName: "architect", wave: 0, dependsOn: [] });
    expect(step.status).toBe("pending");

    await ledger.markRunning(step.id);
    await ledger.markSucceeded(step.id, ["component:1", "dataflow:1"]);

    const found = await ledger.findSucceededStep(runId, "architect");
    expect(found?.status).toBe("succeeded");
    expect(found?.outputRefs).toEqual(["component:1", "dataflow:1"]);

    const steps = await ledger.listSteps(runId);
    expect(steps).toHaveLength(1);
  });

  it("records failure and skip reasons", async () => {
    const failedStep = await ledger.createStep({ runId, agentName: "threat", wave: 1, dependsOn: ["architect"] });
    await ledger.markFailed(failedStep.id, "boom");

    const skippedStep = await ledger.createStep({ runId, agentName: "risk", wave: 2, dependsOn: ["threat"] });
    await ledger.markSkipped(skippedStep.id, 'Upstream dependency "threat" did not succeed');

    const steps = await ledger.listSteps(runId);
    const threatStep = steps.find((s) => s.agentName === "threat");
    const riskStep = steps.find((s) => s.agentName === "risk");
    expect(threatStep?.status).toBe("failed");
    expect(threatStep?.error).toBe("boom");
    expect(riskStep?.status).toBe("skipped");
  });
});
