import { describe, expect, it } from "vitest";
import { buildThreatModelMarkdown } from "./threat-model-md.js";
import type { ReportData } from "./gather-report-data.js";

describe("buildThreatModelMarkdown", () => {
  it("renders all four Shostack questions with real data woven in", () => {
    const data = {
      project: { name: "Acme Storefront" },
      systemModel: {
        components: [{ id: "c1", name: "API", type: "process", description: "Public API" }],
        dataflows: [],
        trustBoundaries: [],
      },
      attackPaths: [
        {
          id: "ap1",
          name: "Phishing against API user",
          strideCategories: ["spoofing"],
          groundingRefs: [{ techniqueId: "T1566" }],
          applicability: "applicable",
          notApplicableRationale: null,
        },
        {
          id: "ap2",
          name: "Cloud IAM abuse",
          strideCategories: ["elevation-of-privilege"],
          groundingRefs: [{ techniqueId: "T1078.004" }],
          applicability: "not-applicable",
          notApplicableRationale: "No cloud IAM in this on-prem deployment.",
        },
      ],
      riskScores: [{ attackPathId: "ap1", rank: 1, score: 80 } as never],
      mitigations: [{ title: "Enable MFA", controlFamily: "Identification and Authentication", priority: "high", description: "Require MFA for all API users." } as never],
      assumptions: [{ statement: "TLS terminates at the API.", source: "inferred" } as never],
      designDeltas: [{ kind: "trust-boundary-correction", description: "Split public/internal tiers." } as never],
      validationFindings: [{ passed: true } as never, { passed: false } as never],
      coverage: { framework: "enterprise", coveragePercent: 42.5 } as never,
      pivotNodes: [{ componentId: "c1", attackPathCount: 3, trustBoundaryCrossingCount: 1, linkedMitigationIds: [] }],
    } as unknown as ReportData;

    const md = buildThreatModelMarkdown(data, 73, {
      validationPassRate: 0.5,
      coverageScore: 0.8,
      groundingScore: 1,
      pivotNodeResolutionScore: 0,
    });

    expect(md).toContain("# Threat Model: Acme Storefront");
    expect(md).toContain("Confidence score:** 73/100");
    expect(md).toContain("Phishing against API user");
    expect(md).toContain("T1566");
    expect(md).toContain("Cloud IAM abuse");
    expect(md).toContain("No cloud IAM in this on-prem deployment.");
    expect(md).toContain("Enable MFA");
    expect(md).toContain("TLS terminates at the API.");
    expect(md).toContain("Split public/internal tiers.");
    expect(md).toContain("1/2 invariant checks passed");
    expect(md).toContain("42.5% of the enterprise corpus");
    expect(md).toContain("appears in 3 attack paths");
  });
});
