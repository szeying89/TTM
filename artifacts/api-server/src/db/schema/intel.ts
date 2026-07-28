import { jsonb, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { mitreFrameworkEnum } from "./technique-chunks.js";

export const intelFeedSourceTypeEnum = pgEnum("intel_feed_source_type", ["url", "pdf"]);
export const intelFeedStatusEnum = pgEnum("intel_feed_status", ["pending", "processed", "failed"]);
export const intelSignalTypeEnum = pgEnum("intel_signal_type", [
  "active-exploitation",
  "threat-actor-targeting",
  "cve-severity",
  "sector-relevance",
  "other",
]);

export const intelFeedItems = pgTable("intel_feed_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  sourceType: intelFeedSourceTypeEnum("source_type").notNull(),
  sourceRef: text("source_ref").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  rawTextRef: text("raw_text_ref"),
  status: intelFeedStatusEnum("status").notNull().default("pending"),
  failureReason: text("failure_reason"),
});

export const intelSignals = pgTable("intel_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  intelFeedItemId: uuid("intel_feed_item_id")
    .notNull()
    .references(() => intelFeedItems.id),
  signalType: intelSignalTypeEnum("signal_type").notNull(),
  relatedTechniqueIds: jsonb("related_technique_ids")
    .notNull()
    .$type<{ techniqueId: string; framework: (typeof mitreFrameworkEnum.enumValues)[number] }[]>()
    .default([]),
  relatedComponentIds: jsonb("related_component_ids").notNull().$type<string[]>().default([]),
  severity: real("severity").notNull(),
  summary: text("summary").notNull(),
  confidence: real("confidence").notNull(),
  extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
});
