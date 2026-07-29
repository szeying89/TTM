import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { mitigationRecommendations } from "../../db/schema/mitigations.js";

export async function loadMitigationsForSystemModel(db: Db, systemModelId: string) {
  return db
    .select({ id: mitigationRecommendations.id, attackPathIds: mitigationRecommendations.attackPathIds })
    .from(mitigationRecommendations)
    .where(eq(mitigationRecommendations.systemModelId, systemModelId));
}
