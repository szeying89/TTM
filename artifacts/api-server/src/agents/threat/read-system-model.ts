import { desc, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { components, dataflows, systemModels, trustBoundaries } from "../../db/schema/system-model.js";

export interface LoadedSystemModel {
  systemModelId: string;
  components: (typeof components.$inferSelect)[];
  dataflows: (typeof dataflows.$inferSelect)[];
  trustBoundaries: (typeof trustBoundaries.$inferSelect)[];
}

export async function loadLatestSystemModelForRun(db: Db, runId: string): Promise<LoadedSystemModel> {
  const [systemModel] = await db
    .select()
    .from(systemModels)
    .where(eq(systemModels.runId, runId))
    .orderBy(desc(systemModels.createdAt))
    .limit(1);
  if (!systemModel) throw new Error(`No system model found for run "${runId}"`);

  const [componentRows, dataflowRows, trustBoundaryRows] = await Promise.all([
    db.select().from(components).where(eq(components.systemModelId, systemModel.id)),
    db.select().from(dataflows).where(eq(dataflows.systemModelId, systemModel.id)),
    db.select().from(trustBoundaries).where(eq(trustBoundaries.systemModelId, systemModel.id)),
  ]);

  return {
    systemModelId: systemModel.id,
    components: componentRows,
    dataflows: dataflowRows,
    trustBoundaries: trustBoundaryRows,
  };
}
