import { z } from "zod";
import { StrideCategory } from "@intel-threat-modeller/contracts";

export const StrideCandidate = z.object({
  name: z.string(),
  strideCategories: z.array(StrideCategory).min(1),
  entities: z.array(z.object({ componentId: z.string(), role: z.string() })).min(1),
  killChainStages: z.array(z.string()).default([]),
  groundingRefs: z.array(z.object({ techniqueId: z.string(), chunkId: z.string() })).min(1),
});
export type StrideCandidate = z.infer<typeof StrideCandidate>;

export const StrideGeneratorOutput = z.object({
  attackPaths: z.array(StrideCandidate),
});
export type StrideGeneratorOutput = z.infer<typeof StrideGeneratorOutput>;
