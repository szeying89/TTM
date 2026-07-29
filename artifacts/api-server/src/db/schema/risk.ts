import { integer, jsonb, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { attackPaths } from "./threats.js";

export interface CriAdjustmentRow {
  function: string;
  maturityTier: string;
  modifier: number;
  rationale: string;
}

export interface IntelAdjustmentRow {
  intelSignalIds: string[];
  modifier: number;
  rationale: string;
}

export const riskScores = pgTable("risk_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  attackPathId: uuid("attack_path_id")
    .notNull()
    .references(() => attackPaths.id),
  likelihood: real("likelihood").notNull(),
  impact: real("impact").notNull(),
  baseScore: real("base_score").notNull(),
  criAdjustment: jsonb("cri_adjustment").notNull().$type<CriAdjustmentRow>(),
  intelAdjustment: jsonb("intel_adjustment").$type<IntelAdjustmentRow>(),
  score: real("score").notNull(),
  rank: integer("rank").notNull(),
  heatmapCell: text("heatmap_cell").notNull(),
  rationale: text("rationale").notNull(),
});
