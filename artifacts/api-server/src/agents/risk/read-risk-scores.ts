import { asc, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { attackPaths } from "../../db/schema/threats.js";
import { riskScores } from "../../db/schema/risk.js";

export interface RankedAttackPath {
  id: string;
  name: string;
  strideCategories: string[];
  applicability: string;
  score: number;
  rank: number;
}

export async function loadRankedAttackPathsForSystemModel(db: Db, systemModelId: string): Promise<RankedAttackPath[]> {
  const rows = await db
    .select({
      id: attackPaths.id,
      name: attackPaths.name,
      strideCategories: attackPaths.strideCategories,
      applicability: attackPaths.applicability,
      score: riskScores.score,
      rank: riskScores.rank,
    })
    .from(riskScores)
    .innerJoin(attackPaths, eq(riskScores.attackPathId, attackPaths.id))
    .where(eq(attackPaths.systemModelId, systemModelId))
    .orderBy(asc(riskScores.rank));

  return rows;
}
