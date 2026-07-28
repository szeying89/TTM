import type { Db } from "../../db/client.js";
import { assumptions, designDeltas } from "../../db/schema/design-enrich.js";
import type { AssumptionCandidate, DesignDeltaCandidate } from "./schema.js";

export async function persistDesignEnrichment(
  db: Db,
  systemModelId: string,
  assumptionCandidates: AssumptionCandidate[],
  designDeltaCandidates: DesignDeltaCandidate[],
): Promise<{ assumptionIds: string[]; designDeltaIds: string[] }> {
  const assumptionIds =
    assumptionCandidates.length === 0
      ? []
      : (
          await db
            .insert(assumptions)
            .values(
              assumptionCandidates.map((a) => ({
                systemModelId,
                statement: a.statement,
                relatedComponentIds: a.relatedComponentIds,
                source: a.source,
              })),
            )
            .returning({ id: assumptions.id })
        ).map((r) => r.id);

  const designDeltaIds =
    designDeltaCandidates.length === 0
      ? []
      : (
          await db
            .insert(designDeltas)
            .values(
              designDeltaCandidates.map((d) => ({
                systemModelId,
                kind: d.kind,
                targetId: d.targetId,
                description: d.description,
                proposedChange: {},
              })),
            )
            .returning({ id: designDeltas.id })
        ).map((r) => r.id);

  return { assumptionIds, designDeltaIds };
}
