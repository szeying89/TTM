import { describe, expect, it } from "vitest";
import { AttackPath } from "./attack-path.js";

const baseApplicable = {
  id: "ap1",
  name: "Unauthenticated internal API access",
  sourcePass: "rule-pack" as const,
  strideCategories: ["spoofing" as const],
  entities: [{ componentId: "c1", role: "target" }],
  killChainStages: ["initial-access"],
  groupKey: "c1|T1190",
  groundingRefs: [
    { techniqueId: "T1190", framework: "enterprise" as const, chunkId: "chunk1", retrievalScore: 0.9 },
  ],
  applicability: "applicable" as const,
};

describe("AttackPath", () => {
  it("parses a valid applicable attack path", () => {
    expect(AttackPath.safeParse(baseApplicable).success).toBe(true);
  });

  it("rejects a not-applicable path missing a rationale", () => {
    const result = AttackPath.safeParse({
      ...baseApplicable,
      applicability: "not-applicable",
      notApplicableRationale: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a not-applicable path with a rationale", () => {
    const result = AttackPath.safeParse({
      ...baseApplicable,
      applicability: "not-applicable",
      notApplicableRationaleCategory: "out-of-scope-for-framework",
      notApplicableRationale: "This technique targets cloud IAM, out of scope for the ICS framework selected.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a path with an empty entities array", () => {
    const result = AttackPath.safeParse({ ...baseApplicable, entities: [] });
    expect(result.success).toBe(false);
  });
});
