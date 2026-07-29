import { z } from "zod";
import { MitreFramework, StrideCategory } from "./frameworks.js";

export const SourcePass = z.enum(["rule-pack", "stride-llm", "other-threats"]);
export type SourcePass = z.infer<typeof SourcePass>;

export const GroundingRef = z.object({
  techniqueId: z.string(),
  framework: MitreFramework,
  chunkId: z.string(),
  retrievalScore: z.number().min(0).max(1),
});
export type GroundingRef = z.infer<typeof GroundingRef>;

export const AttackPathEntity = z.object({
  componentId: z.string(),
  role: z.string(),
});
export type AttackPathEntity = z.infer<typeof AttackPathEntity>;

export const NotApplicableRationaleCategory = z.enum([
  "out-of-scope-for-framework",
  "mitigated-by-design",
  "no-matching-entity",
  "duplicate-of-covered-technique",
  "other",
]);
export type NotApplicableRationaleCategory = z.infer<typeof NotApplicableRationaleCategory>;

export const AttackPath = z
  .object({
    id: z.string(),
    name: z.string(),
    sourcePass: SourcePass,
    strideCategories: z.array(StrideCategory).min(1),
    entities: z.array(AttackPathEntity).min(1),
    killChainStages: z.array(z.string()),
    groupKey: z.string(),
    groundingRefs: z.array(GroundingRef),
    applicability: z.enum(["applicable", "not-applicable"]),
    notApplicableRationaleCategory: NotApplicableRationaleCategory.optional(),
    notApplicableRationale: z.string().optional(),
  })
  .refine(
    (path) =>
      path.applicability !== "not-applicable" ||
      (!!path.notApplicableRationale && path.notApplicableRationale.trim().length > 0),
    {
      message: "notApplicableRationale is required when applicability is 'not-applicable'",
      path: ["notApplicableRationale"],
    },
  );
export type AttackPath = z.infer<typeof AttackPath>;
