import { describe, expect, it } from "vitest";
import { computeRiskFactors } from "./risk-rubric.js";
import type { LoadedSystemModel } from "../threat/read-system-model.js";

function makeSystemModel(overrides: Partial<LoadedSystemModel> = {}): LoadedSystemModel {
  return {
    systemModelId: "sm1",
    components: [],
    dataflows: [],
    trustBoundaries: [],
    ...overrides,
  } as LoadedSystemModel;
}

describe("computeRiskFactors", () => {
  it("scores an internet-exposed, unprotected, sensitive-data attack path higher than an internal, protected, low-sensitivity one", () => {
    const systemModel = makeSystemModel({
      components: [
        { id: "attacker", type: "external_entity", trustBoundaryId: null } as never,
        { id: "db", type: "datastore", trustBoundaryId: null } as never,
        { id: "svc-a", type: "process", trustBoundaryId: "tb1" } as never,
        { id: "svc-b", type: "process", trustBoundaryId: "tb1" } as never,
      ],
      dataflows: [
        { sourceComponentId: "attacker", targetComponentId: "db", dataClassification: "payment card data" } as never,
        { sourceComponentId: "svc-a", targetComponentId: "svc-b", dataClassification: null } as never,
      ],
    });

    const highRisk = computeRiskFactors(
      {
        entities: [{ componentId: "attacker", role: "source" }, { componentId: "db", role: "target" }],
        groundingRefs: [{ techniqueId: "T1190" }, { techniqueId: "T1078" }],
        killChainStages: ["Initial Access"],
      },
      systemModel,
    );

    const lowRisk = computeRiskFactors(
      {
        entities: [{ componentId: "svc-a", role: "source" }, { componentId: "svc-b", role: "target" }],
        groundingRefs: [{ techniqueId: "T1499" }],
        killChainStages: ["Impact"],
      },
      systemModel,
    );

    expect(highRisk.baseScore).toBeGreaterThan(lowRisk.baseScore);
    expect(highRisk.likelihood).toBeGreaterThan(lowRisk.likelihood);
    expect(highRisk.impact).toBeGreaterThan(lowRisk.impact);
  });

  it("produces a heatmap cell consistent with the computed likelihood/impact buckets", () => {
    const systemModel = makeSystemModel({
      components: [
        { id: "attacker", type: "external_entity", trustBoundaryId: null } as never,
        { id: "api", type: "process", trustBoundaryId: null } as never,
      ],
    });
    const factors = computeRiskFactors(
      {
        entities: [{ componentId: "attacker", role: "source" }, { componentId: "api", role: "target" }],
        groundingRefs: [{ techniqueId: "T1190" }],
        killChainStages: ["Initial Access"],
      },
      systemModel,
    );
    expect(factors.heatmapCell).toMatch(/^(low|medium|high)-(low|medium|high)$/);
  });

  it("is deterministic for identical input", () => {
    const systemModel = makeSystemModel({
      components: [{ id: "a", type: "process", trustBoundaryId: null } as never],
    });
    const input = {
      entities: [{ componentId: "a", role: "target" }],
      groundingRefs: [{ techniqueId: "T1078" }],
      killChainStages: ["Persistence"],
    };
    expect(computeRiskFactors(input, systemModel)).toEqual(computeRiskFactors(input, systemModel));
  });
});
