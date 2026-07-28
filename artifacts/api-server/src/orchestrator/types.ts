export interface AgentContext {
  runId: string;
}

export interface AgentResult {
  outputRefs: string[];
}

export type AgentHandler = (ctx: AgentContext) => Promise<AgentResult>;

export interface AgentDescriptor {
  name: string;
  dependsOn: string[];
  outputs: string[];
  handler: AgentHandler;
}

export type PipelineStepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export interface PipelineStepRecord {
  id: string;
  runId: string;
  agentName: string;
  wave: number;
  dependsOn: string[];
  status: PipelineStepStatus;
  startedAt?: string;
  finishedAt?: string;
  inputRefs: string[];
  outputRefs: string[];
  error?: string;
  retryCount: number;
}

export interface PipelineStepsLedger {
  createStep(record: Omit<PipelineStepRecord, "id" | "status" | "inputRefs" | "outputRefs" | "retryCount">): Promise<PipelineStepRecord>;
  markRunning(id: string): Promise<void>;
  markSucceeded(id: string, outputRefs: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markSkipped(id: string, reason: string): Promise<void>;
  findSucceededStep(runId: string, agentName: string): Promise<PipelineStepRecord | undefined>;
  listSteps(runId: string): Promise<PipelineStepRecord[]>;
}
