import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { components, dataflows, systemModels, trustBoundaries } from "../../db/schema/system-model.js";
import type { ArchitectOutput } from "./schema.js";

export interface PersistedSystemModel {
  systemModelId: string;
  componentIds: string[];
  dataflowIds: string[];
  trustBoundaryIds: string[];
}

export async function persistSystemModel(
  db: Db,
  runId: string,
  output: ArchitectOutput,
): Promise<PersistedSystemModel> {
  const [systemModel] = await db.insert(systemModels).values({ runId }).returning();
  if (!systemModel) throw new Error("Failed to insert system_models row");

  // Trust boundaries are inserted first (componentIds populated in a second
  // pass, once real component UUIDs exist) so components can resolve their
  // trustBoundaryId immediately.
  const trustBoundaryIdByLocalId = new Map<string, string>();
  for (const tb of output.trustBoundaries) {
    const [row] = await db
      .insert(trustBoundaries)
      .values({ systemModelId: systemModel.id, name: tb.name, componentIds: [] })
      .returning();
    if (!row) throw new Error("Failed to insert trust_boundaries row");
    trustBoundaryIdByLocalId.set(tb.id, row.id);
  }

  const componentIdByLocalId = new Map<string, string>();
  const componentLocalIdsByTrustBoundaryDbId = new Map<string, string[]>();
  for (const c of output.components) {
    const trustBoundaryDbId = c.trustBoundaryId ? trustBoundaryIdByLocalId.get(c.trustBoundaryId) : undefined;
    const [row] = await db
      .insert(components)
      .values({
        systemModelId: systemModel.id,
        name: c.name,
        type: c.type,
        description: c.description,
        technologies: c.technologies,
        trustBoundaryId: trustBoundaryDbId,
        sourceRefs: c.sourceRefs,
      })
      .returning();
    if (!row) throw new Error("Failed to insert components row");
    componentIdByLocalId.set(c.id, row.id);
    if (trustBoundaryDbId) {
      const list = componentLocalIdsByTrustBoundaryDbId.get(trustBoundaryDbId) ?? [];
      list.push(row.id);
      componentLocalIdsByTrustBoundaryDbId.set(trustBoundaryDbId, list);
    }
  }

  for (const [trustBoundaryDbId, componentDbIds] of componentLocalIdsByTrustBoundaryDbId) {
    await db.update(trustBoundaries).set({ componentIds: componentDbIds }).where(eq(trustBoundaries.id, trustBoundaryDbId));
  }

  const dataflowIds: string[] = [];
  for (const df of output.dataflows) {
    const sourceComponentId = componentIdByLocalId.get(df.sourceComponentId);
    const targetComponentId = componentIdByLocalId.get(df.targetComponentId);
    if (!sourceComponentId || !targetComponentId) {
      throw new Error(
        `Dataflow "${df.name}" references an unknown component id (${df.sourceComponentId} -> ${df.targetComponentId})`,
      );
    }
    const crossesTrustBoundaryIds = df.crossesTrustBoundaryIds
      .map((localId) => trustBoundaryIdByLocalId.get(localId))
      .filter((id): id is string => !!id);

    const [row] = await db
      .insert(dataflows)
      .values({
        systemModelId: systemModel.id,
        name: df.name,
        sourceComponentId,
        targetComponentId,
        protocol: df.protocol,
        dataClassification: df.dataClassification,
        crossesTrustBoundaryIds,
      })
      .returning();
    if (!row) throw new Error("Failed to insert dataflows row");
    dataflowIds.push(row.id);
  }

  return {
    systemModelId: systemModel.id,
    componentIds: Array.from(componentIdByLocalId.values()),
    dataflowIds,
    trustBoundaryIds: Array.from(trustBoundaryIdByLocalId.values()),
  };
}
