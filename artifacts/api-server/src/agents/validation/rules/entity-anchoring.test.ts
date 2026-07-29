import { describe, expect, it } from "vitest";
import { checkEntityAnchoring } from "./entity-anchoring.js";

describe("checkEntityAnchoring", () => {
  it("passes when every entity resolves to a real component", () => {
    const findings = checkEntityAnchoring(
      [
        {
          id: "ap1",
          entities: [{ componentId: "c1", role: "target" }],
          groundingRefs: [],
          groupKey: "gk1",
          applicability: "applicable",
          notApplicableRationale: null,
        },
      ],
      [{ id: "c1", type: "process" }],
    );
    expect(findings).toEqual([
      { ruleId: "entity-anchoring", category: "entity-anchoring", targetId: "ap1", passed: true, message: expect.any(String) },
    ]);
  });

  it("fails when an entity references a nonexistent component id", () => {
    const findings = checkEntityAnchoring(
      [
        {
          id: "ap1",
          entities: [{ componentId: "ghost", role: "target" }],
          groundingRefs: [],
          groupKey: "gk1",
          applicability: "applicable",
          notApplicableRationale: null,
        },
      ],
      [{ id: "c1", type: "process" }],
    );
    expect(findings[0]?.passed).toBe(false);
    expect(findings[0]?.message).toContain("ghost");
  });
});
