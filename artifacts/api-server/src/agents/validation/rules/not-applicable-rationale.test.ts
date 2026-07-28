import { describe, expect, it } from "vitest";
import { checkNotApplicableRationale } from "./not-applicable-rationale.js";

describe("checkNotApplicableRationale", () => {
  it("ignores applicable attack paths", () => {
    expect(
      checkNotApplicableRationale([
        { id: "ap1", entities: [], groundingRefs: [], groupKey: "gk", applicability: "applicable", notApplicableRationale: null },
      ]),
    ).toEqual([]);
  });

  it("passes when the rationale meets the minimum-quality length threshold", () => {
    const findings = checkNotApplicableRationale([
      {
        id: "ap1",
        entities: [],
        groundingRefs: [],
        groupKey: "gk",
        applicability: "not-applicable",
        notApplicableRationale: "This technique targets cloud IAM, which is out of scope for this on-prem system.",
      },
    ]);
    expect(findings[0]?.passed).toBe(true);
  });

  it("fails when the rationale is missing", () => {
    const findings = checkNotApplicableRationale([
      { id: "ap1", entities: [], groundingRefs: [], groupKey: "gk", applicability: "not-applicable", notApplicableRationale: null },
    ]);
    expect(findings[0]?.passed).toBe(false);
  });

  it("fails when the rationale is too short to be substantive", () => {
    const findings = checkNotApplicableRationale([
      { id: "ap1", entities: [], groundingRefs: [], groupKey: "gk", applicability: "not-applicable", notApplicableRationale: "N/A" },
    ]);
    expect(findings[0]?.passed).toBe(false);
  });
});
