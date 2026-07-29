import { z } from "zod";
import { Component, Dataflow, TrustBoundary } from "@intel-threat-modeller/contracts";

// Local IDs (Component.id, TrustBoundary.id) are the LLM's own short handles
// (e.g. "web-browser") used only to cross-reference within this response -
// persist.ts resolves them to real DB-generated UUIDs.
export const ArchitectOutput = z.object({
  components: z.array(Component).min(1),
  dataflows: z.array(Dataflow),
  trustBoundaries: z.array(TrustBoundary),
});
export type ArchitectOutput = z.infer<typeof ArchitectOutput>;
