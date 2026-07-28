import type { Db } from "../../db/client.js";
import { coverageCriticResults, pivotNodeFindings, validationFindings } from "../../db/schema/validation.js";
import type { ValidationFindingCandidate } from "./types.js";
import type { CoverageCriticResult } from "./coverage-critic.js";
import type { PivotNodeFinding } from "./pivot-node-detection.js";

export async function persistValidationResults(
  db: Db,
  systemModelId: string,
  findings: ValidationFindingCandidate[],
  coverage: CoverageCriticResult,
  pivotNodes: PivotNodeFinding[],
): Promise<{ findingIds: string[]; coverageId: string; pivotNodeIds: string[] }> {
  const findingRows =
    findings.length === 0
      ? []
      : await db
          .insert(validationFindings)
          .values(
            findings.map((f) => ({
              systemModelId,
              ruleId: f.ruleId,
              category: f.category,
              targetId: f.targetId,
              passed: f.passed,
              message: f.message,
            })),
          )
          .returning({ id: validationFindings.id });

  const [coverageRow] = await db
    .insert(coverageCriticResults)
    .values({
      systemModelId,
      framework: coverage.framework,
      techniquesCovered: coverage.techniquesCovered,
      techniquesUnaddressed: coverage.techniquesUnaddressed,
      coveragePercent: coverage.coveragePercent,
    })
    .returning({ id: coverageCriticResults.id });
  if (!coverageRow) throw new Error("Failed to insert coverage_critic_results row");

  const pivotNodeRows =
    pivotNodes.length === 0
      ? []
      : await db
          .insert(pivotNodeFindings)
          .values(
            pivotNodes.map((p) => ({
              systemModelId,
              componentId: p.componentId,
              attackPathCount: p.attackPathCount,
              trustBoundaryCrossingCount: p.trustBoundaryCrossingCount,
              linkedMitigationIds: p.linkedMitigationIds,
            })),
          )
          .returning({ id: pivotNodeFindings.id });

  return {
    findingIds: findingRows.map((r) => r.id),
    coverageId: coverageRow.id,
    pivotNodeIds: pivotNodeRows.map((r) => r.id),
  };
}
