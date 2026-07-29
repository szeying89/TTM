import { describe, expect, it } from "vitest";
import { Component } from "./component.js";

describe("Component", () => {
  it("parses a valid component", () => {
    const result = Component.safeParse({
      id: "c1",
      name: "API Gateway",
      type: "process",
      description: "Public-facing API gateway",
      technologies: ["nginx"],
      trustBoundaryId: "tb1",
      sourceRefs: ["design-doc.md#L12"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid component type", () => {
    const result = Component.safeParse({
      id: "c1",
      name: "API Gateway",
      type: "not-a-real-type",
      description: "x",
      technologies: [],
      sourceRefs: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a component missing required fields", () => {
    const result = Component.safeParse({ id: "c1" });
    expect(result.success).toBe(false);
  });
});
