import { z } from "zod";

export const TrustBoundary = z.object({
  id: z.string(),
  name: z.string(),
  componentIds: z.array(z.string()),
});
export type TrustBoundary = z.infer<typeof TrustBoundary>;
