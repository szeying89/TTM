// Versioned confidence-score weights. The score is a weighted composite of
// four independently-measurable signals surfaced by the Validation agent -
// it is never an LLM self-rating its own output.
export const CONFIDENCE_WEIGHTS = {
  validationPassRate: 0.4,
  coverageScore: 0.25,
  groundingScore: 0.25,
  pivotNodeResolutionScore: 0.1,
} as const;

export interface ConfidenceSubScores {
  validationPassRate: number;
  coverageScore: number;
  groundingScore: number;
  pivotNodeResolutionScore: number;
}

export function computeConfidenceScore(subScores: ConfidenceSubScores): number {
  const raw =
    CONFIDENCE_WEIGHTS.validationPassRate * subScores.validationPassRate +
    CONFIDENCE_WEIGHTS.coverageScore * subScores.coverageScore +
    CONFIDENCE_WEIGHTS.groundingScore * subScores.groundingScore +
    CONFIDENCE_WEIGHTS.pivotNodeResolutionScore * subScores.pivotNodeResolutionScore;
  return Math.round(100 * Math.max(0, Math.min(1, raw)));
}
