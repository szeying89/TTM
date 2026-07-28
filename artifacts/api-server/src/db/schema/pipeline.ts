import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const pipelineRunStatusEnum = pgEnum("pipeline_run_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const pipelineStepStatusEnum = pgEnum("pipeline_step_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  status: pipelineRunStatusEnum("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const pipelineSteps = pgTable("pipeline_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => pipelineRuns.id),
  agentName: text("agent_name").notNull(),
  wave: integer("wave").notNull(),
  dependsOn: jsonb("depends_on").notNull().$type<string[]>(),
  status: pipelineStepStatusEnum("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  inputRefs: jsonb("input_refs").notNull().$type<string[]>().default([]),
  outputRefs: jsonb("output_refs").notNull().$type<string[]>().default([]),
  error: text("error"),
  retryCount: integer("retry_count").notNull().default(0),
});
