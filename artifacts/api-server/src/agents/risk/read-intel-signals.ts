import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { intelFeedItems, intelSignals } from "../../db/schema/intel.js";

export async function loadIntelSignalsForProject(db: Db, projectId: string) {
  return db
    .select({
      id: intelSignals.id,
      signalType: intelSignals.signalType,
      relatedTechniqueIds: intelSignals.relatedTechniqueIds,
      relatedComponentIds: intelSignals.relatedComponentIds,
      severity: intelSignals.severity,
    })
    .from(intelSignals)
    .innerJoin(intelFeedItems, eq(intelSignals.intelFeedItemId, intelFeedItems.id))
    .where(eq(intelFeedItems.projectId, projectId));
}
