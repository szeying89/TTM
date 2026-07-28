import { describe, expect, it } from "vitest";
import { computeIntelAdjustment } from "./intel-adjustment.js";

const attackPath = {
  entities: [{ componentId: "api", role: "target" }],
  groundingRefs: [{ techniqueId: "T1566" }],
};

describe("computeIntelAdjustment", () => {
  it("returns undefined when no intel signals match", () => {
    const result = computeIntelAdjustment(attackPath, [
      { id: "s1", signalType: "other", relatedTechniqueIds: [{ techniqueId: "T1078", framework: "enterprise" }], relatedComponentIds: [], severity: 0.5 },
    ]);
    expect(result).toBeUndefined();
  });

  it("matches on technique id and applies a bounded modifier proportional to severity", () => {
    const result = computeIntelAdjustment(attackPath, [
      { id: "s1", signalType: "active-exploitation", relatedTechniqueIds: [{ techniqueId: "T1566", framework: "enterprise" }], relatedComponentIds: [], severity: 1 },
    ]);
    expect(result).toBeDefined();
    expect(result?.intelSignalIds).toEqual(["s1"]);
    expect(result?.modifier).toBeCloseTo(0.2);
  });

  it("matches on related component id even without a technique overlap", () => {
    const result = computeIntelAdjustment(attackPath, [
      { id: "s1", signalType: "sector-relevance", relatedTechniqueIds: [], relatedComponentIds: ["api"], severity: 0.5 },
    ]);
    expect(result).toBeDefined();
  });

  it("caps the combined modifier at 0.20 even with multiple high-severity matches", () => {
    const result = computeIntelAdjustment(attackPath, [
      { id: "s1", signalType: "active-exploitation", relatedTechniqueIds: [{ techniqueId: "T1566", framework: "enterprise" }], relatedComponentIds: [], severity: 1 },
      { id: "s2", signalType: "threat-actor-targeting", relatedTechniqueIds: [{ techniqueId: "T1566", framework: "enterprise" }], relatedComponentIds: [], severity: 1 },
    ]);
    expect(result?.modifier).toBeLessThanOrEqual(0.2);
    expect(result?.intelSignalIds).toEqual(["s1", "s2"]);
  });
});
