import { afterEach, describe, expect, it } from "vitest";
import { clearRegistry, getRegistry, registerAgent } from "./registry.js";

afterEach(() => clearRegistry());

describe("agent registry", () => {
  it("registers and lists agent descriptors", () => {
    registerAgent({ name: "architect", dependsOn: [], outputs: ["SystemModel"], handler: async () => ({ outputRefs: [] }) });
    expect(getRegistry()).toHaveLength(1);
    expect(getRegistry()[0]?.name).toBe("architect");
  });

  it("rejects re-registering the same agent name", () => {
    registerAgent({ name: "architect", dependsOn: [], outputs: [], handler: async () => ({ outputRefs: [] }) });
    expect(() =>
      registerAgent({ name: "architect", dependsOn: [], outputs: [], handler: async () => ({ outputRefs: [] }) }),
    ).toThrow(/already registered/);
  });
});
