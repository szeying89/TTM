import { randomUUID } from "node:crypto";
import type { PipelineStepRecord, PipelineStepsLedger } from "./types.js";

// Fast, dependency-free ledger for unit tests. Production runs use the
// Drizzle-backed ledger against the pipeline_steps table (see drizzle-ledger.ts).
export class InMemoryPipelineStepsLedger implements PipelineStepsLedger {
  private steps = new Map<string, PipelineStepRecord>();

  async createStep(
    record: Omit<PipelineStepRecord, "id" | "status" | "inputRefs" | "outputRefs" | "retryCount">,
  ): Promise<PipelineStepRecord> {
    const step: PipelineStepRecord = {
      ...record,
      id: randomUUID(),
      status: "pending",
      inputRefs: [],
      outputRefs: [],
      retryCount: 0,
    };
    this.steps.set(step.id, step);
    return step;
  }

  async markRunning(id: string): Promise<void> {
    const step = this.get(id);
    step.status = "running";
    step.startedAt = new Date().toISOString();
  }

  async markSucceeded(id: string, outputRefs: string[]): Promise<void> {
    const step = this.get(id);
    step.status = "succeeded";
    step.outputRefs = outputRefs;
    step.finishedAt = new Date().toISOString();
  }

  async markFailed(id: string, error: string): Promise<void> {
    const step = this.get(id);
    step.status = "failed";
    step.error = error;
    step.finishedAt = new Date().toISOString();
  }

  async markSkipped(id: string, reason: string): Promise<void> {
    const step = this.get(id);
    step.status = "skipped";
    step.error = reason;
    step.finishedAt = new Date().toISOString();
  }

  async findSucceededStep(runId: string, agentName: string): Promise<PipelineStepRecord | undefined> {
    return Array.from(this.steps.values()).find(
      (s) => s.runId === runId && s.agentName === agentName && s.status === "succeeded",
    );
  }

  async listSteps(runId: string): Promise<PipelineStepRecord[]> {
    return Array.from(this.steps.values()).filter((s) => s.runId === runId);
  }

  private get(id: string): PipelineStepRecord {
    const step = this.steps.get(id);
    if (!step) throw new Error(`No pipeline step with id "${id}"`);
    return step;
  }
}
