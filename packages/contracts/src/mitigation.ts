import { z } from "zod";
import { CriFunction } from "./frameworks.js";

export const MitigationRecommendation = z.object({
  id: z.string(),
  attackPathIds: z.array(z.string()).min(1),
  controlFamily: z.string(),
  criFunction: CriFunction.optional(),
  criDiagnosticStatement: z.string().optional(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["proposed", "accepted", "rejected", "implemented"]),
});
export type MitigationRecommendation = z.infer<typeof MitigationRecommendation>;
