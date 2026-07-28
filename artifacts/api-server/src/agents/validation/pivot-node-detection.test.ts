import { describe, expect, it } from "vitest";
import { detectPivotNodes } from "./pivot-node-detection.js";

function attackPathTouching(id: string, componentId: string) {
  return {
    id,
    entities: [{ componentId, role: "target" }],
    groundingRefs: [],
    groupKey: id,
    applicability: "applicable" as const,
    notApplicableRationale: null,
  };
}

describe("detectPivotNodes", () => {
  it("flags a component appearing in 3+ distinct attack paths", () => {
    const findings = detectPivotNodes(
      [attackPathTouching("ap1", "api"), attackPathTouching("ap2", "api"), attackPathTouching("ap3", "api")],
      [],
      [],
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.componentId).toBe("api");
    expect(findings[0]?.attackPathCount).toBe(3);
  });

  it("does not flag a component appearing in only 1-2 attack paths with no boundary crossings", () => {
    const findings = detectPivotNodes([attackPathTouching("ap1", "api"), attackPathTouching("ap2", "api")], [], []);
    expect(findings).toHaveLength(0);
  });

  it("flags a component with 2+ trust-boundary crossings even with few attack paths", () => {
    const findings = detectPivotNodes(
      [attackPathTouching("ap1", "gateway")],
      [
        { sourceComponentId: "gateway", targetComponentId: "svc-a", crossesTrustBoundaryIds: ["tb1"] },
        { sourceComponentId: "gateway", targetComponentId: "svc-b", crossesTrustBoundaryIds: ["tb2"] },
      ],
      [],
    );
    expect(findings.find((f) => f.componentId === "gateway")).toBeDefined();
  });

  it("links mitigation ids that reference any of the pivot node's attack paths", () => {
    const findings = detectPivotNodes(
      [attackPathTouching("ap1", "api"), attackPathTouching("ap2", "api"), attackPathTouching("ap3", "api")],
      [],
      [{ id: "mit1", attackPathIds: ["ap1", "ap2"] }, { id: "mit2", attackPathIds: ["ap3"] }],
    );
    expect(findings[0]?.linkedMitigationIds.sort()).toEqual(["mit1", "mit2"]);
  });

  it("sorts findings by descending attack path count", () => {
    const findings = detectPivotNodes(
      [
        attackPathTouching("ap1", "low"),
        attackPathTouching("ap2", "low"),
        attackPathTouching("ap3", "low"),
        attackPathTouching("ap4", "high"),
        attackPathTouching("ap5", "high"),
        attackPathTouching("ap6", "high"),
        attackPathTouching("ap7", "high"),
      ],
      [],
      [],
    );
    expect(findings[0]?.componentId).toBe("high");
  });
});
