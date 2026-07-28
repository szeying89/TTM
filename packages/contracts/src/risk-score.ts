import { z } from "zod";
import { CriFunction, CriMaturityTier } from "./frameworks.js";

export const CriAdjustment = z.object({
  function: CriFunction,
  maturityTier: CriMaturityTier,
  modifier: z.number(),
  rationale: z.string(),
});
export type CriAdjustment = z.infer<typeof CriAdjustment>;

export const IntelAdjustment = z.object({
  intelSignalIds: z.array(z.string()).min(1),
  modifier: z.number(),
  rationale: z.string(),
});
export type IntelAdjustment = z.infer<typeof IntelAdjustment>;

export const RiskScore = z.object({
  id: z.string(),
  attackPathId: z.string(),
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  baseScore: z.number().min(0).max(100),
  criAdjustment: CriAdjustment,
  intelAdjustment: IntelAdjustment.optional(),
  score: z.number().min(0).max(100),
  rank: z.number().int().min(1),
  heatmapCell: z.string(),
  rationale: z.string(),
});
export type RiskScore = z.infer<typeof RiskScore>;
