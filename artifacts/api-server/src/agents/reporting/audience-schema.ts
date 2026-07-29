import { z } from "zod";

export const AudienceSummary = z.object({
  summary: z.string(),
  keyRecommendations: z.array(z.string()).min(1),
});
export type AudienceSummary = z.infer<typeof AudienceSummary>;
