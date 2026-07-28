import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pipelineRuns } from "./pipeline.js";

export const componentTypeEnum = pgEnum("component_type", [
  "process",
  "datastore",
  "external_entity",
  "actor",
]);

export const systemModels = pgTable("system_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => pipelineRuns.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trustBoundaries = pgTable("trust_boundaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  name: text("name").notNull(),
  componentIds: jsonb("component_ids").notNull().$type<string[]>().default([]),
});

export const components = pgTable("components", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  name: text("name").notNull(),
  type: componentTypeEnum("type").notNull(),
  description: text("description").notNull().default(""),
  technologies: jsonb("technologies").notNull().$type<string[]>().default([]),
  trustBoundaryId: uuid("trust_boundary_id").references(() => trustBoundaries.id),
  sourceRefs: jsonb("source_refs").notNull().$type<string[]>().default([]),
});

export const dataflows = pgTable("dataflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  name: text("name").notNull(),
  sourceComponentId: uuid("source_component_id")
    .notNull()
    .references(() => components.id),
  targetComponentId: uuid("target_component_id")
    .notNull()
    .references(() => components.id),
  protocol: text("protocol"),
  dataClassification: text("data_classification"),
  crossesTrustBoundaryIds: jsonb("crosses_trust_boundary_ids").notNull().$type<string[]>().default([]),
});
