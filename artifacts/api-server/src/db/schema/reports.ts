import { jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pipelineRuns } from "./pipeline.js";

export const reportAudienceEnum = pgEnum("report_audience", ["executive", "ciso", "technical"]);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => pipelineRuns.id),
  audience: reportAudienceEnum("audience").notNull(),
  confidence: real("confidence").notNull(),
  confidenceSubScores: jsonb("confidence_sub_scores")
    .notNull()
    .$type<{
      validationPassRate: number;
      coverageScore: number;
      groundingScore: number;
      pivotNodeResolutionScore: number;
    }>(),
  markdown: text("markdown").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});
