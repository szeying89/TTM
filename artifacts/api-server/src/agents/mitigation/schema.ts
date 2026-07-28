import { z } from "zod";
import { CriFunction } from "@intel-threat-modeller/contracts";
import { NIST_800_53_FAMILIES } from "./control-families.js";

export const MitigationCandidate = z.object({
  attackPathIds: z.array(z.string()).min(1),
  controlFamily: z.enum(NIST_800_53_FAMILIES),
  criFunction: CriFunction.optional(),
  criDiagnosticStatement: z.string().optional(),
  title: z.string(),
  description: z.string(),
});
export type MitigationCandidate = z.infer<typeof MitigationCandidate>;

export const MitigationOutput = z.object({
  recommendations: z.array(MitigationCandidate),
});
export type MitigationOutput = z.infer<typeof MitigationOutput>;
