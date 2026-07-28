import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { pipelineSteps } from "../db/schema/pipeline.js";
import type { PipelineStepRecord, PipelineStepsLedger } from "./types.js";

function toRecord(row: typeof pipelineSteps.$inferSelect): PipelineStepRecord {
  return {
    id: row.id,
    runId: row.runId,
    agentName: row.agentName,
    wave: row.wave,
    dependsOn: row.dependsOn,
    status: row.status,
    startedAt: row.startedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    inputRefs: row.inputRefs,
    outputRefs: row.outputRefs,
    error: row.error ?? undefined,
    retryCount: row.retryCount,
  };
}

export class DrizzlePipelineStepsLedger implements PipelineStepsLedger {
  constructor(private readonly db: Db) {}

  async createStep(
    record: Omit<PipelineStepRecord, "id" | "status" | "inputRefs" | "outputRefs" | "retryCount">,
  ): Promise<PipelineStepRecord> {
    const [row] = await this.db
      .insert(pipelineSteps)
      .values({
        runId: record.runId,
        agentName: record.agentName,
        wave: record.wave,
        dependsOn: record.dependsOn,
      })
      .returning();
    if (!row) throw new Error("Failed to insert pipeline_steps row");
    return toRecord(row);
  }

  async markRunning(id: string): Promise<void> {
    await this.db
      .update(pipelineSteps)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(pipelineSteps.id, id));
  }

  async markSucceeded(id: string, outputRefs: string[]): Promise<void> {
    await this.db
      .update(pipelineSteps)
      .set({ status: "succeeded", outputRefs, finishedAt: new Date() })
      .where(eq(pipelineSteps.id, id));
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db
      .update(pipelineSteps)
      .set({ status: "failed", error, finishedAt: new Date() })
      .where(eq(pipelineSteps.id, id));
  }

  async markSkipped(id: string, reason: string): Promise<void> {
    await this.db
      .update(pipelineSteps)
      .set({ status: "skipped", error: reason, finishedAt: new Date() })
      .where(eq(pipelineSteps.id, id));
  }

  async findSucceededStep(runId: string, agentName: string): Promise<PipelineStepRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(pipelineSteps)
      .where(
        and(
          eq(pipelineSteps.runId, runId),
          eq(pipelineSteps.agentName, agentName),
          eq(pipelineSteps.status, "succeeded"),
        ),
      )
      .limit(1);
    return row ? toRecord(row) : undefined;
  }

  async listSteps(runId: string): Promise<PipelineStepRecord[]> {
    const rows = await this.db.select().from(pipelineSteps).where(eq(pipelineSteps.runId, runId));
    return rows.map(toRecord);
  }
}
