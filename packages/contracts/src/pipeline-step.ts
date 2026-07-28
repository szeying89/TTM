import { z } from "zod";

export const PipelineStepStatus = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);
export type PipelineStepStatus = z.infer<typeof PipelineStepStatus>;

export const PipelineStep = z.object({
  id: z.string(),
  runId: z.string(),
  agentName: z.string(),
  wave: z.number().int().min(0),
  dependsOn: z.array(z.string()),
  status: PipelineStepStatus,
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  inputRefs: z.array(z.string()),
  outputRefs: z.array(z.string()),
  error: z.string().optional(),
  retryCount: z.number().int().min(0),
});
export type PipelineStep = z.infer<typeof PipelineStep>;

export const AgentDescriptor = z.object({
  name: z.string(),
  dependsOn: z.array(z.string()),
  outputs: z.array(z.string()),
});
export type AgentDescriptor = z.infer<typeof AgentDescriptor>;
