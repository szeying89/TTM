import { describe, expect, it } from "vitest";
import { computeCriAdjustment } from "./cri-profile.js";

describe("computeCriAdjustment", () => {
  it("applies a moderate uncertainty modifier when maturity is not assessed", () => {
    const result = computeCriAdjustment(["spoofing"], {});
    expect(result.function).toBe("protect");
    expect(result.maturityTier).toBe("not-assessed");
    expect(result.modifier).toBeGreaterThan(0);
  });

  it("gives a lower maturity tier a larger positive modifier than a higher one", () => {
    const baseline = computeCriAdjustment(["tampering"], { protect: "baseline" });
    const advanced = computeCriAdjustment(["tampering"], { protect: "advanced" });
    expect(baseline.modifier).toBeGreaterThan(advanced.modifier);
  });

  it("maps denial-of-service to the respond function", () => {
    const result = computeCriAdjustment(["denial-of-service"], { respond: "innovative" });
    expect(result.function).toBe("respond");
    expect(result.modifier).toBeLessThan(0);
  });

  it("uses the primary (first) STRIDE category when multiple are present", () => {
    const result = computeCriAdjustment(["repudiation", "spoofing"], { detect: "baseline", protect: "advanced" });
    expect(result.function).toBe("detect");
  });
});
