import { boolean, integer, jsonb, pgEnum, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { systemModels } from "./system-model.js";

export const validationCategoryEnum = pgEnum("validation_category", [
  "entity-anchoring",
  "group-key",
  "not-applicable-rationale",
  "coverage",
  "pivot-node",
]);

export const validationFindings = pgTable("validation_findings", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  ruleId: text("rule_id").notNull(),
  category: validationCategoryEnum("category").notNull(),
  targetId: text("target_id").notNull(),
  passed: boolean("passed").notNull(),
  message: text("message").notNull(),
});

export const coverageCriticResults = pgTable("coverage_critic_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  framework: text("framework").notNull(),
  techniquesCovered: jsonb("techniques_covered").notNull().$type<string[]>(),
  techniquesUnaddressed: jsonb("techniques_unaddressed").notNull().$type<string[]>(),
  coveragePercent: real("coverage_percent").notNull(),
});

export const pivotNodeFindings = pgTable("pivot_node_findings", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  componentId: uuid("component_id").notNull(),
  attackPathCount: integer("attack_path_count").notNull(),
  trustBoundaryCrossingCount: integer("trust_boundary_crossing_count").notNull(),
  linkedMitigationIds: jsonb("linked_mitigation_ids").notNull().$type<string[]>().default([]),
});
