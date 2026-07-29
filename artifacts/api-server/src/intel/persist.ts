import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { intelFeedItems, intelSignals } from "../db/schema/intel.js";
import type { ExtractedSignal } from "./extract.js";

export async function persistIntelSignals(db: Db, intelFeedItemId: string, signals: ExtractedSignal[]): Promise<string[]> {
  if (signals.length === 0) return [];
  const rows = await db
    .insert(intelSignals)
    .values(
      signals.map((s) => ({
        intelFeedItemId,
        signalType: s.signalType as (typeof intelSignals.$inferInsert)["signalType"],
        relatedTechniqueIds: s.relatedTechniqueIds,
        relatedComponentIds: s.relatedComponentIds,
        severity: s.severity,
        summary: s.summary,
        confidence: s.confidence,
      })),
    )
    .returning({ id: intelSignals.id });
  return rows.map((r) => r.id);
}

export async function markIntelFeedProcessed(db: Db, id: string): Promise<void> {
  await db.update(intelFeedItems).set({ status: "processed" }).where(eq(intelFeedItems.id, id));
}

export async function markIntelFeedFailed(db: Db, id: string, reason: string): Promise<void> {
  await db.update(intelFeedItems).set({ status: "failed", failureReason: reason }).where(eq(intelFeedItems.id, id));
}
