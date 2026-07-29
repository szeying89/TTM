import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CriFunction, CriMaturityTier } from "@intel-threat-modeller/contracts";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  criMaturity: jsonb("cri_maturity")
    .notNull()
    .default({})
    .$type<Partial<Record<CriFunction, CriMaturityTier>>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const designDocs = pgTable("design_docs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  prose: text("prose").notNull().default(""),
  mermaidText: text("mermaid_text").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
