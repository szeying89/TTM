import { describe, expect, it } from "vitest";
import { priorityFromScore } from "./persist.js";

describe("priorityFromScore", () => {
  it.each([
    [90, "critical"],
    [75, "critical"],
    [74, "high"],
    [50, "high"],
    [49, "medium"],
    [25, "medium"],
    [24, "low"],
    [0, "low"],
  ])("maps score %i to priority %s", (score, expected) => {
    expect(priorityFromScore(score)).toBe(expected);
  });
});
