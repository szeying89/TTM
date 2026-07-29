import { describe, expect, it } from "vitest";
import { computeConfidenceScore } from "./scoring-config.js";

describe("computeConfidenceScore", () => {
  it("returns 100 when every sub-score is perfect", () => {
    expect(
      computeConfidenceScore({
        validationPassRate: 1,
        coverageScore: 1,
        groundingScore: 1,
        pivotNodeResolutionScore: 1,
      }),
    ).toBe(100);
  });

  it("returns 0 when every sub-score is zero", () => {
    expect(
      computeConfidenceScore({
        validationPassRate: 0,
        coverageScore: 0,
        groundingScore: 0,
        pivotNodeResolutionScore: 0,
      }),
    ).toBe(0);
  });

  it("weights validationPassRate most heavily", () => {
    const highValidation = computeConfidenceScore({
      validationPassRate: 1,
      coverageScore: 0,
      groundingScore: 0,
      pivotNodeResolutionScore: 0,
    });
    const highPivot = computeConfidenceScore({
      validationPassRate: 0,
      coverageScore: 0,
      groundingScore: 0,
      pivotNodeResolutionScore: 1,
    });
    expect(highValidation).toBeGreaterThan(highPivot);
    expect(highValidation).toBe(40);
    expect(highPivot).toBe(10);
  });

  it("drops proportionally when validation has failures", () => {
    const full = computeConfidenceScore({ validationPassRate: 1, coverageScore: 1, groundingScore: 1, pivotNodeResolutionScore: 1 });
    const halfValidation = computeConfidenceScore({ validationPassRate: 0.5, coverageScore: 1, groundingScore: 1, pivotNodeResolutionScore: 1 });
    expect(full - halfValidation).toBe(20); // 0.40 weight * 0.5 drop * 100
  });
});
