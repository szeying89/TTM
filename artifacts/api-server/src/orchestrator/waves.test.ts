import { describe, expect, it } from "vitest";
import { buildWaves } from "./waves.js";
import type { AgentDescriptor } from "./types.js";

const noop = async () => ({ outputRefs: [] });

function stub(name: string, dependsOn: string[]): AgentDescriptor {
  return { name, dependsOn, outputs: [], handler: noop };
}

const sevenAgentGraph: AgentDescriptor[] = [
  stub("architect", []),
  stub("threat", ["architect"]),
  stub("risk", ["threat"]),
  stub("mitigation", ["risk"]),
  stub("design-enrich", ["risk"]),
  stub("validation", ["mitigation", "design-enrich"]),
  stub("reporting", ["validation"]),
];

describe("buildWaves", () => {
  it("layers the 7-agent graph into 6 waves, with Mitigation and Design-Enrich sharing a wave", () => {
    const waves = buildWaves(sevenAgentGraph);
    expect(waves).toEqual([
      ["architect"],
      ["threat"],
      ["risk"],
      ["design-enrich", "mitigation"],
      ["validation"],
      ["reporting"],
    ]);
  });

  it("throws on an unknown dependency", () => {
    expect(() => buildWaves([stub("a", ["ghost"])])).toThrow(/unknown agent/);
  });

  it("throws on a cycle", () => {
    expect(() => buildWaves([stub("a", ["b"]), stub("b", ["a"])])).toThrow(/Cycle detected/);
  });

  it("adding a new sibling that only depends on risk joins the same wave", () => {
    const withNewSibling = [...sevenAgentGraph, stub("compliance-check", ["risk"])];
    const waves = buildWaves(withNewSibling);
    expect(waves[3]).toEqual(["compliance-check", "design-enrich", "mitigation"]);
  });
});
