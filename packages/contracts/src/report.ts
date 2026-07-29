import { z } from "zod";

export const ReportAudience = z.enum(["executive", "ciso", "technical"]);
export type ReportAudience = z.infer<typeof ReportAudience>;

export const ConfidenceSubScores = z.object({
  validationPassRate: z.number().min(0).max(1),
  coverageScore: z.number().min(0).max(1),
  groundingScore: z.number().min(0).max(1),
  pivotNodeResolutionScore: z.number().min(0).max(1),
});
export type ConfidenceSubScores = z.infer<typeof ConfidenceSubScores>;

export const Report = z.object({
  id: z.string(),
  runId: z.string(),
  audience: ReportAudience,
  confidence: z.number().min(0).max(100),
  confidenceSubScores: ConfidenceSubScores,
  markdown: z.string(),
  generatedAt: z.string(),
});
export type Report = z.infer<typeof Report>;
