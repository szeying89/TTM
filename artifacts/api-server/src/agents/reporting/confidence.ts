import type { ReportData } from "./gather-report-data.js";
import type { ConfidenceSubScores } from "./scoring-config.js";

export function computeConfidenceSubScores(data: ReportData): ConfidenceSubScores {
  const totalFindings = data.validationFindings.length;
  const passedFindings = data.validationFindings.filter((f) => f.passed).length;
  const validationPassRate = totalFindings === 0 ? 1 : passedFindings / totalFindings;

  const coveredCount = data.coverage?.techniquesCovered.length ?? 0;
  const unaddressedCount = data.coverage?.techniquesUnaddressed.length ?? 0;
  const coverageDenominator = coveredCount + unaddressedCount;
  const coverageScore = coverageDenominator === 0 ? 1 : coveredCount / coverageDenominator;

  const totalAttackPaths = data.attackPaths.length;
  const groundedAttackPaths = data.attackPaths.filter((p) => p.groundingRefs.length > 0).length;
  const groundingScore = totalAttackPaths === 0 ? 1 : groundedAttackPaths / totalAttackPaths;

  const totalPivotNodes = data.pivotNodes.length;
  const resolvedPivotNodes = data.pivotNodes.filter((p) => p.linkedMitigationIds.length > 0).length;
  const pivotNodeResolutionScore = totalPivotNodes === 0 ? 1 : resolvedPivotNodes / totalPivotNodes;

  return { validationPassRate, coverageScore, groundingScore, pivotNodeResolutionScore };
}
