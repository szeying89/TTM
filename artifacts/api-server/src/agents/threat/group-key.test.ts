import { describe, expect, it } from "vitest";
import { computeGroupKey } from "./group-key.js";

describe("computeGroupKey", () => {
  it("is stable regardless of entity id order", () => {
    expect(computeGroupKey(["c2", "c1"], "T1566")).toBe(computeGroupKey(["c1", "c2"], "T1566"));
  });

  it("differs for a different technique against the same entities", () => {
    expect(computeGroupKey(["c1", "c2"], "T1566")).not.toBe(computeGroupKey(["c1", "c2"], "T1078"));
  });

  it("differs for a different entity set against the same technique", () => {
    expect(computeGroupKey(["c1", "c2"], "T1566")).not.toBe(computeGroupKey(["c1", "c3"], "T1566"));
  });
});
