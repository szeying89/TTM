import { describe, expect, it } from "vitest";
import { buildRiskRegisterCsv } from "./risk-register-csv.js";
import type { ReportData } from "./gather-report-data.js";

function makeData(overrides: Partial<ReportData>): ReportData {
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

describe("buildRiskRegisterCsv", () => {
  it("produces a header row plus one row per attack path, sorted by risk rank", () => {
    const csv = buildRiskRegisterCsv(
      makeData({
        attackPaths: [
          { id: "ap-low", name: "Low risk path", strideCategories: ["spoofing"], applicability: "applicable" } as never,
          { id: "ap-high", name: "High risk path", strideCategories: ["tampering"], applicability: "applicable" } as never,
        ],
        riskScores: [
          { attackPathId: "ap-low", rank: 2, score: 20, likelihood: 0.2, impact: 0.3, heatmapCell: "low-low" } as never,
          { attackPathId: "ap-high", rank: 1, score: 90, likelihood: 0.9, impact: 0.9, heatmapCell: "high-high" } as never,
        ],
        mitigations: [{ attackPathIds: ["ap-high"], title: "Enforce MFA" } as never],
      }),
    );

    const lines = csv.split("\n");
    expect(lines[0]).toContain("Rank");
    expect(lines[1]).toContain("High risk path");
    expect(lines[1]).toContain("Enforce MFA");
    expect(lines[2]).toContain("Low risk path");
  });

  it("escapes commas and quotes in fields", () => {
    const csv = buildRiskRegisterCsv(
      makeData({
        attackPaths: [{ id: "ap1", name: 'Path with, comma and "quote"', strideCategories: [], applicability: "applicable" } as never],
      }),
    );
    expect(csv).toContain('"Path with, comma and ""quote"""');
  });
});
