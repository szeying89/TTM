import type { Db } from "../../db/client.js";
import { mitigationRecommendations } from "../../db/schema/mitigations.js";
import type { MitigationCandidate } from "./schema.js";

export function priorityFromScore(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export async function persistMitigations(
  db: Db,
  systemModelId: string,
  candidates: MitigationCandidate[],
  scoreByAttackPathId: Map<string, number>,
): Promise<string[]> {
  if (candidates.length === 0) return [];

  const rows = await db
    .insert(mitigationRecommendations)
    .values(
      candidates.map((c) => {
        const maxScore = Math.max(...c.attackPathIds.map((id) => scoreByAttackPathId.get(id) ?? 0));
        return {
          systemModelId,
          attackPathIds: c.attackPathIds,
          controlFamily: c.controlFamily,
          criFunction: c.criFunction,
          criDiagnosticStatement: c.criDiagnosticStatement,
          title: c.title,
          description: c.description,
          priority: priorityFromScore(maxScore),
        };
      }),
    )
    .returning({ id: mitigationRecommendations.id });

  return rows.map((r) => r.id);
}
