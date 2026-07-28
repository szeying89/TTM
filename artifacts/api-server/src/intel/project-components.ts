import { desc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { pipelineRuns } from "../db/schema/pipeline.js";
import { components, systemModels } from "../db/schema/system-model.js";

export async function loadLatestProjectComponents(
  db: Db,
  projectId: string,
): Promise<{ id: string; name: string; type: string }[]> {
  const [latestSystemModel] = await db
    .select({ id: systemModels.id })
    .from(systemModels)
    .innerJoin(pipelineRuns, eq(systemModels.runId, pipelineRuns.id))
    .where(eq(pipelineRuns.projectId, projectId))
    .orderBy(desc(systemModels.createdAt))
    .limit(1);

  if (!latestSystemModel) return [];

  const rows = await db
    .select({ id: components.id, name: components.name, type: components.type })
    .from(components)
    .where(eq(components.systemModelId, latestSystemModel.id));
  return rows;
}
