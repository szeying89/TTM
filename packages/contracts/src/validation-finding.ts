import { z } from "zod";

export const ValidationCategory = z.enum([
  "entity-anchoring",
  "group-key",
  "not-applicable-rationale",
  "coverage",
  "pivot-node",
]);
export type ValidationCategory = z.infer<typeof ValidationCategory>;

export const ValidationFinding = z.object({
  id: z.string(),
  ruleId: z.string(),
  category: ValidationCategory,
  targetId: z.string(),
  passed: z.boolean(),
  message: z.string(),
});
export type ValidationFinding = z.infer<typeof ValidationFinding>;

export const CoverageCriticOutput = z.object({
  framework: z.string(),
  techniquesCovered: z.array(z.string()),
  techniquesUnaddressed: z.array(z.string()),
  coveragePercent: z.number().min(0).max(100),
});
export type CoverageCriticOutput = z.infer<typeof CoverageCriticOutput>;

export const PivotNodeFinding = z.object({
  componentId: z.string(),
  attackPathCount: z.number().int().min(0),
  trustBoundaryCrossingCount: z.number().int().min(0),
  linkedMitigationIds: z.array(z.string()),
});
export type PivotNodeFinding = z.infer<typeof PivotNodeFinding>;
