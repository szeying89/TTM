import { z } from "zod";

export const RiskRationale = z.object({
  attackPathId: z.string(),
  rationale: z.string(),
});

export const RiskRationaleOutput = z.object({
  rationales: z.array(RiskRationale),
});
export type RiskRationaleOutput = z.infer<typeof RiskRationaleOutput>;
