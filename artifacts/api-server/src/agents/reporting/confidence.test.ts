import { describe, expect, it } from "vitest";
import { computeConfidenceSubScores } from "./confidence.js";
import type { ReportData } from "./gather-report-data.js";

function makeReportData(overrides: Partial<ReportData>): ReportData {
  return {
    run: {} as never,
    project: {} as never,
    systemModel: {} as never,
    attackPaths: [],
    riskScores: [],
    mitigations: [],
    assumptions: [],
    designDeltas: [],
    validationFindings: [],
    coverage: undefined,
    pivotNodes: [],
    ...overrides,
  } as ReportData;
}

describe("computeConfidenceSubScores", () => {
  it("defaults every sub-score to 1 (best case) when there is nothing to measure", () => {
    const scores = computeConfidenceSubScores(makeReportData({}));
    expect(scores).toEqual({ validationPassRate: 1, coverageScore: 1, groundingScore: 1, pivotNodeResolutionScore: 1 });
  });

  it("computes validationPassRate from the ratio of passed findings", () => {
    const scores = computeConfidenceSubScores(
      makeReportData({
        validationFindings: [
          { passed: true } as never,
          { passed: true } as never,
          { passed: false } as never,
          { passed: true } as never,
        ],
      }),
    );
    expect(scores.validationPassRate).toBe(0.75);
  });

  it("computes coverageScore from covered vs unaddressed technique counts", () => {
    const scores = computeConfidenceSubScores(
      makeReportData({
        coverage: { techniquesCovered: ["T1", "T2", "T3"], techniquesUnaddressed: ["T4"] } as never,
      }),
    );
    expect(scores.coverageScore).toBe(0.75);
  });

  it("computes groundingScore from attack paths with at least one grounding ref", () => {
    const scores = computeConfidenceSubScores(
      makeReportData({
        attackPaths: [
          { groundingRefs: [{ techniqueId: "T1" }] } as never,
          { groundingRefs: [] } as never,
        ],
      }),
    );
    expect(scores.groundingScore).toBe(0.5);
  });

  it("computes pivotNodeResolutionScore from pivot nodes with a linked mitigation", () => {
    const scores = computeConfidenceSubScores(
      makeReportData({
        pivotNodes: [
          { linkedMitigationIds: ["m1"] } as never,
          { linkedMitigationIds: [] } as never,
          { linkedMitigationIds: [] } as never,
        ],
      }),
    );
    expect(scores.pivotNodeResolutionScore).toBeCloseTo(1 / 3);
  });
});
