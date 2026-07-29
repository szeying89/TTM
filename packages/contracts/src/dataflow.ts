import { z } from "zod";

export const Dataflow = z.object({
  id: z.string(),
  name: z.string(),
  sourceComponentId: z.string(),
  targetComponentId: z.string(),
  protocol: z.string().optional(),
  dataClassification: z.string().optional(),
  crossesTrustBoundaryIds: z.array(z.string()),
});
export type Dataflow = z.infer<typeof Dataflow>;
