import { z } from "zod";
import { MitreFramework } from "./frameworks.js";

export const IntelFeedSourceType = z.enum(["url", "pdf"]);
export type IntelFeedSourceType = z.infer<typeof IntelFeedSourceType>;

export const IntelFeedStatus = z.enum(["pending", "processed", "failed"]);
export type IntelFeedStatus = z.infer<typeof IntelFeedStatus>;

export const IntelFeedItem = z.object({
  id: z.string(),
  projectId: z.string(),
  sourceType: IntelFeedSourceType,
  sourceRef: z.string(),
  fetchedAt: z.string(),
  rawTextRef: z.string().optional(),
  status: IntelFeedStatus,
  failureReason: z.string().optional(),
});
export type IntelFeedItem = z.infer<typeof IntelFeedItem>;

export const IntelSignalType = z.enum([
  "active-exploitation",
  "threat-actor-targeting",
  "cve-severity",
  "sector-relevance",
  "other",
]);
export type IntelSignalType = z.infer<typeof IntelSignalType>;

export const IntelSignal = z.object({
  id: z.string(),
  intelFeedItemId: z.string(),
  signalType: IntelSignalType,
  relatedTechniqueIds: z.array(z.object({ techniqueId: z.string(), framework: MitreFramework })),
  relatedComponentIds: z.array(z.string()),
  severity: z.number().min(0).max(1),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  extractedAt: z.string(),
});
export type IntelSignal = z.infer<typeof IntelSignal>;
