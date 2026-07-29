import { z } from "zod";

export const AssumptionCandidate = z.object({
  statement: z.string(),
  relatedComponentIds: z.array(z.string()).default([]),
  source: z.enum(["explicit", "inferred"]),
});
export type AssumptionCandidate = z.infer<typeof AssumptionCandidate>;

export const DesignDeltaCandidate = z.object({
  kind: z.enum(["dataflow-refinement", "trust-boundary-correction", "component-addition"]),
  targetId: z.string().optional(),
  description: z.string(),
});
export type DesignDeltaCandidate = z.infer<typeof DesignDeltaCandidate>;

export const DesignEnrichOutput = z.object({
  assumptions: z.array(AssumptionCandidate),
  designDeltas: z.array(DesignDeltaCandidate),
});
export type DesignEnrichOutput = z.infer<typeof DesignEnrichOutput>;
