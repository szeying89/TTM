import type { AttackPath } from "@intel-threat-modeller/contracts";
import type { Db } from "../../db/client.js";
import { attackPaths } from "../../db/schema/threats.js";

export async function persistAttackPaths(db: Db, systemModelId: string, paths: AttackPath[]): Promise<string[]> {
  if (paths.length === 0) return [];

  const rows = await db
    .insert(attackPaths)
    .values(
      paths.map((p) => ({
        systemModelId,
        name: p.name,
        sourcePass: p.sourcePass,
        strideCategories: p.strideCategories,
        entities: p.entities,
        killChainStages: p.killChainStages,
        groupKey: p.groupKey,
        groundingRefs: p.groundingRefs,
        applicability: p.applicability,
        notApplicableRationaleCategory: p.notApplicableRationaleCategory,
        notApplicableRationale: p.notApplicableRationale,
      })),
    )
    .returning({ id: attackPaths.id });

  return rows.map((r) => r.id);
}
