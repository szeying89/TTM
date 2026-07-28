import { describe, expect, it } from "vitest";
import { checkGroupKeys } from "./group-key.js";
import { computeGroupKey } from "../../threat/group-key.js";

describe("checkGroupKeys", () => {
  it("passes format, consistency, and no-over-merge checks for a well-formed unique attack path", () => {
    const groupKey = computeGroupKey(["c1"], "T1566");
    const findings = checkGroupKeys([
      {
        id: "ap1",
        entities: [{ componentId: "c1", role: "target" }],
        groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "x", retrievalScore: 1 }],
        groupKey,
        applicability: "applicable",
        notApplicableRationale: null,
      },
    ]);
    expect(findings.every((f) => f.passed)).toBe(true);
  });

  it("fails the format check for a malformed groupKey", () => {
    const findings = checkGroupKeys([
      {
        id: "ap1",
        entities: [{ componentId: "c1", role: "target" }],
        groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "x", retrievalScore: 1 }],
        groupKey: "not-a-valid-hash",
        applicability: "applicable",
        notApplicableRationale: null,
      },
    ]);
    expect(findings.find((f) => f.ruleId === "group-key-format")?.passed).toBe(false);
  });

  it("fails the consistency check when groupKey doesn't match a recomputation from its own entities/technique", () => {
    const findings = checkGroupKeys([
      {
        id: "ap1",
        entities: [{ componentId: "c1", role: "target" }],
        groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "x", retrievalScore: 1 }],
        groupKey: computeGroupKey(["some-other-entity"], "T9999"),
        applicability: "applicable",
        notApplicableRationale: null,
      },
    ]);
    expect(findings.find((f) => f.ruleId === "group-key-consistency")?.passed).toBe(false);
  });

  it("fails the no-over-merge check when two persisted attack paths share a groupKey", () => {
    const sharedKey = computeGroupKey(["c1"], "T1566");
    const findings = checkGroupKeys([
      {
        id: "ap1",
        entities: [{ componentId: "c1", role: "target" }],
        groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "x", retrievalScore: 1 }],
        groupKey: sharedKey,
        applicability: "applicable",
        notApplicableRationale: null,
      },
      {
        id: "ap2",
        entities: [{ componentId: "c1", role: "target" }],
        groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "y", retrievalScore: 1 }],
        groupKey: sharedKey,
        applicability: "applicable",
        notApplicableRationale: null,
      },
    ]);
    const overMergeFindings = findings.filter((f) => f.ruleId === "group-key-no-over-merge");
    expect(overMergeFindings.every((f) => !f.passed)).toBe(true);
  });
});
