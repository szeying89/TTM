import { z } from "zod";

export const Assumption = z.object({
  id: z.string(),
  statement: z.string(),
  relatedComponentIds: z.array(z.string()),
  source: z.enum(["explicit", "inferred"]),
});
export type Assumption = z.infer<typeof Assumption>;

export const DesignDelta = z.object({
  id: z.string(),
  kind: z.enum(["dataflow-refinement", "trust-boundary-correction", "component-addition"]),
  targetId: z.string().optional(),
  description: z.string(),
  proposedChange: z.record(z.string(), z.unknown()),
});
export type DesignDelta = z.infer<typeof DesignDelta>;
