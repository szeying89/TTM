import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { vector } from "./vector-type.js";

export const EMBEDDING_DIMENSIONS = 1024;

export const mitreFrameworkEnum = pgEnum("mitre_framework", ["enterprise", "ics", "atlas"]);
export const chunkTypeEnum = pgEnum("chunk_type", ["description", "detection", "mitigation", "example"]);

export const techniqueChunks = pgTable(
  "technique_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    techniqueId: text("technique_id").notNull(),
    framework: mitreFrameworkEnum("framework").notNull(),
    name: text("name").notNull(),
    tactic: text("tactic").notNull(),
    chunkType: chunkTypeEnum("chunk_type").notNull(),
    chunkText: text("chunk_text").notNull(),
    embedding: vector(EMBEDDING_DIMENSIONS)("embedding").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    contentHash: text("content_hash").notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    techniqueIdIdx: index("technique_chunks_technique_id_idx").on(table.techniqueId),
    frameworkIdx: index("technique_chunks_framework_idx").on(table.framework),
    contentHashIdx: index("technique_chunks_content_hash_idx").on(table.contentHash),
  }),
);
