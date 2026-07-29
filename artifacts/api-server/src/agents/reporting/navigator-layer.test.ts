import { describe, expect, it } from "vitest";
import { buildNavigatorLayer } from "./navigator-layer.js";

describe("buildNavigatorLayer", () => {
  it("includes one technique entry per distinct techniqueId from applicable attack paths", () => {
    const layer = buildNavigatorLayer(
      "Test Project",
      "enterprise",
      [
        { name: "Phishing path", groundingRefs: [{ techniqueId: "T1566" }], applicability: "applicable" },
        { name: "Not applicable path", groundingRefs: [{ techniqueId: "T1499" }], applicability: "not-applicable" },
      ],
      new Map([["T1566", 80]]),
    );

    expect(layer.techniques).toHaveLength(1);
    expect(layer.techniques[0]?.techniqueID).toBe("T1566");
    expect(layer.techniques[0]?.score).toBe(80);
    expect(layer.techniques[0]?.color).toBe("#8b0000");
    expect(layer.domain).toBe("enterprise-attack");
  });

  it("uses the ics domain for the ics framework", () => {
    const layer = buildNavigatorLayer("Test", "ics", [], new Map());
    expect(layer.domain).toBe("ics-attack");
  });

  it("merges multiple attack paths citing the same technique into one entry with combined comments", () => {
    const layer = buildNavigatorLayer(
      "Test",
      "enterprise",
      [
        { name: "Path A", groundingRefs: [{ techniqueId: "T1078" }], applicability: "applicable" },
        { name: "Path B", groundingRefs: [{ techniqueId: "T1078" }], applicability: "applicable" },
      ],
      new Map([["T1078", 40]]),
    );
    expect(layer.techniques).toHaveLength(1);
    expect(layer.techniques[0]?.comment).toContain("Path A");
    expect(layer.techniques[0]?.comment).toContain("Path B");
  });
});
