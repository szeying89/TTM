import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { systemModels } from "./system-model.js";

export const assumptionSourceEnum = pgEnum("assumption_source", ["explicit", "inferred"]);
export const designDeltaKindEnum = pgEnum("design_delta_kind", [
  "dataflow-refinement",
  "trust-boundary-correction",
  "component-addition",
]);

export const assumptions = pgTable("assumptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  statement: text("statement").notNull(),
  relatedComponentIds: jsonb("related_component_ids").notNull().$type<string[]>().default([]),
  source: assumptionSourceEnum("source").notNull(),
});

export const designDeltas = pgTable("design_deltas", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  kind: designDeltaKindEnum("kind").notNull(),
  targetId: text("target_id"),
  description: text("description").notNull(),
  proposedChange: jsonb("proposed_change").notNull().$type<Record<string, unknown>>().default({}),
});
