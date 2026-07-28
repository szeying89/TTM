import { z } from "zod";
import { IntelSignalType } from "@intel-threat-modeller/contracts";

export const IntelSignalCandidate = z.object({
  signalType: IntelSignalType,
  relatedTechniqueChunkIds: z.array(z.string()).min(1),
  relatedComponentIds: z.array(z.string()).default([]),
  severity: z.number().min(0).max(1),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});
export type IntelSignalCandidate = z.infer<typeof IntelSignalCandidate>;

export const IntelExtractionOutput = z.object({
  signals: z.array(IntelSignalCandidate),
});
export type IntelExtractionOutput = z.infer<typeof IntelExtractionOutput>;
