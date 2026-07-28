import { z } from "zod";
import { StrideCategory } from "@intel-threat-modeller/contracts";

const NotApplicableRationaleCategory = z.enum([
  "out-of-scope-for-framework",
  "mitigated-by-design",
  "no-matching-entity",
  "duplicate-of-covered-technique",
  "other",
]);

export const OtherThreatsDecision = z.object({
  chunkId: z.string(),
  decision: z.enum(["applicable", "not-applicable"]),
  name: z.string(),
  strideCategories: z.array(StrideCategory).default([]),
  entities: z.array(z.object({ componentId: z.string(), role: z.string() })).min(1),
  killChainStages: z.array(z.string()).default([]),
  notApplicableRationaleCategory: NotApplicableRationaleCategory.optional(),
  notApplicableRationale: z.string().optional(),
});
export type OtherThreatsDecision = z.infer<typeof OtherThreatsDecision>;

export const OtherThreatsOutput = z.object({
  decisions: z.array(OtherThreatsDecision),
});
export type OtherThreatsOutput = z.infer<typeof OtherThreatsOutput>;
