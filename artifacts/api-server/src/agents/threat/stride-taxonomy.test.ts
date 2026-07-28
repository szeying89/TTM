import { describe, expect, it } from "vitest";
import { sortKillChainStages } from "./stride-taxonomy.js";

describe("sortKillChainStages", () => {
  it("sorts enterprise stages into kill-chain order regardless of input order", () => {
    expect(sortKillChainStages("enterprise", ["Impact", "Initial Access", "Execution"])).toEqual([
      "Initial Access",
      "Execution",
      "Impact",
    ]);
  });

  it("sorts ics stages into their own kill-chain order", () => {
    expect(sortKillChainStages("ics", ["Impact", "Initial Access"])).toEqual(["Initial Access", "Impact"]);
  });
});
