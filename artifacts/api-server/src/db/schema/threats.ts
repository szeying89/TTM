import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { systemModels } from "./system-model.js";

export const sourcePassEnum = pgEnum("source_pass", ["rule-pack", "stride-llm", "other-threats"]);
export const applicabilityEnum = pgEnum("applicability", ["applicable", "not-applicable"]);

export interface GroundingRefRow {
  techniqueId: string;
  framework: string;
  chunkId: string;
  retrievalScore: number;
}

export interface AttackPathEntityRow {
  componentId: string;
  role: string;
}

export const attackPaths = pgTable("attack_paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemModelId: uuid("system_model_id")
    .notNull()
    .references(() => systemModels.id),
  name: text("name").notNull(),
  sourcePass: sourcePassEnum("source_pass").notNull(),
  strideCategories: jsonb("stride_categories").notNull().$type<string[]>(),
  entities: jsonb("entities").notNull().$type<AttackPathEntityRow[]>(),
  killChainStages: jsonb("kill_chain_stages").notNull().$type<string[]>().default([]),
  groupKey: text("group_key").notNull(),
  groundingRefs: jsonb("grounding_refs").notNull().$type<GroundingRefRow[]>().default([]),
  applicability: applicabilityEnum("applicability").notNull(),
  notApplicableRationaleCategory: text("not_applicable_rationale_category"),
  notApplicableRationale: text("not_applicable_rationale"),
});
