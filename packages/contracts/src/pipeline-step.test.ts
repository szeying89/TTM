import { describe, expect, it } from "vitest";
import { PipelineStep } from "./pipeline-step.js";

describe("PipelineStep", () => {
  it("parses a valid pending step", () => {
    const result = PipelineStep.safeParse({
      id: "s1",
      runId: "run1",
      agentName: "architect",
      wave: 0,
      dependsOn: [],
      status: "pending",
      inputRefs: [],
      outputRefs: [],
      retryCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status", () => {
    const result = PipelineStep.safeParse({
      id: "s1",
      runId: "run1",
      agentName: "architect",
      wave: 0,
      dependsOn: [],
      status: "bogus",
      inputRefs: [],
      outputRefs: [],
      retryCount: 0,
    });
    expect(result.success).toBe(false);
  });
});
