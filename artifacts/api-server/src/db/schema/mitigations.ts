import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { systemModels } from "./system-model.js";

export const mitigationPriorityEnum = pgEnum("mitigation_priority", ["low", "medium", "high", "critical"]);
export const mitigationStatusEnum = pgEnum("mitigation_status", ["proposed", "accepted", "rejected", "implemented"]);

export const mitigationRecommendations = pgTable("mitigation_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  attackPathIds: jsonb("attack_path_ids").notNull().$type<string[]>(),
  controlFamily: text("control_family").notNull(),
  criFunction: text("cri_function"),
  criDiagnosticStatement: text("cri_diagnostic_statement"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: mitigationPriorityEnum("priority").notNull(),
  status: mitigationStatusEnum("status").notNull().default("proposed"),
});
