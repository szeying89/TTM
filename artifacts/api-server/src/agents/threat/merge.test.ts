import { describe, expect, it } from "vitest";
import type { AttackPath } from "@intel-threat-modeller/contracts";
import { mergeAttackPaths } from "./merge.js";

function makePath(overrides: Partial<AttackPath>): AttackPath {
  return {
    id: overrides.id ?? "id1",
    name: "Test path",
    sourcePass: "stride-llm",
    strideCategories: ["spoofing"],
    entities: [{ componentId: "c1", role: "target" }],
    killChainStages: [],
    groupKey: "gk1",
    groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "chunk1", retrievalScore: 1 }],
    applicability: "applicable",
    ...overrides,
  };
}

describe("mergeAttackPaths", () => {
  it("keeps a single path unchanged when there is no duplicate", () => {
    const result = mergeAttackPaths([[makePath({})]]);
    expect(result).toHaveLength(1);
  });

  it("merges duplicates sharing a groupKey, preferring rule-pack identity over stride-llm", () => {
    const rulePackPath = makePath({
      id: "rp1",
      sourcePass: "rule-pack",
      name: "Rule pack finding",
      strideCategories: ["tampering"],
      groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "chunk-rp", retrievalScore: 1 }],
    });
    const llmPath = makePath({
      id: "llm1",
      sourcePass: "stride-llm",
      name: "LLM finding",
      strideCategories: ["spoofing"],
      groundingRefs: [{ techniqueId: "T1566", framework: "enterprise", chunkId: "chunk-llm", retrievalScore: 0.8 }],
    });

    const result = mergeAttackPaths([[llmPath], [rulePackPath]]);
    expect(result).toHaveLength(1);
    expect(result[0]?.sourcePass).toBe("rule-pack");
    expect(result[0]?.name).toBe("Rule pack finding");
    expect(result[0]?.strideCategories.sort()).toEqual(["spoofing", "tampering"]);
    expect(result[0]?.groundingRefs.map((r) => r.chunkId).sort()).toEqual(["chunk-llm", "chunk-rp"]);
  });

  it("keeps distinct groupKeys separate", () => {
    const a = makePath({ id: "a", groupKey: "gkA" });
    const b = makePath({ id: "b", groupKey: "gkB" });
    expect(mergeAttackPaths([[a, b]])).toHaveLength(2);
  });
});
