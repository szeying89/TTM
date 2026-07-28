import type { Db } from "../../db/client.js";
import { riskScores } from "../../db/schema/risk.js";
import type { CriAdjustment, IntelAdjustment } from "@intel-threat-modeller/contracts";

export interface RiskScoreToPersist {
  attackPathId: string;
  likelihood: number;
  impact: number;
  baseScore: number;
  criAdjustment: CriAdjustment;
  intelAdjustment?: IntelAdjustment;
  score: number;
  rank: number;
  heatmapCell: string;
  rationale: string;
}

export async function persistRiskScores(db: Db, scores: RiskScoreToPersist[]): Promise<string[]> {
  if (scores.length === 0) return [];
  const rows = await db
    .insert(riskScores)
    .values(
      scores.map((s) => ({
        attackPathId: s.attackPathId,
        likelihood: s.likelihood,
        impact: s.impact,
        baseScore: s.baseScore,
        criAdjustment: s.criAdjustment,
        intelAdjustment: s.intelAdjustment,
        score: s.score,
        rank: s.rank,
        heatmapCell: s.heatmapCell,
        rationale: s.rationale,
      })),
    )
    .returning({ id: riskScores.id });
  return rows.map((r) => r.id);
}
