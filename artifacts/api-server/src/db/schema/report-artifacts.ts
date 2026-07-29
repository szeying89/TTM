import { jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pipelineRuns } from "./pipeline.js";

export const reportArtifacts = pgTable("report_artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => pipelineRuns.id),
  threatModelMarkdown: text("threat_model_markdown").notNull(),
  jsonDump: jsonb("json_dump").notNull(),
  navigatorLayer: jsonb("navigator_layer").notNull(),
  riskRegisterCsv: text("risk_register_csv").notNull(),
  pdfPath: text("pdf_path"),
  confidence: real("confidence").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});
