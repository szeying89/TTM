import { describe, expect, it } from "vitest";
import { runPipeline } from "./runPipeline.js";
import { InMemoryPipelineStepsLedger } from "./in-memory-ledger.js";
import type { AgentDescriptor } from "./types.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildSevenAgentGraph(overrides: Partial<Record<string, AgentDescriptor["handler"]>> = {}): AgentDescriptor[] {
  const defaultHandler: AgentDescriptor["handler"] = async () => ({ outputRefs: [] });
  const make = (name: string, dependsOn: string[]): AgentDescriptor => ({
    name,
    dependsOn,
    outputs: [],
    handler: overrides[name] ?? defaultHandler,
  });

  return [
    make("architect", []),
    make("threat", ["architect"]),
    make("risk", ["threat"]),
    make("mitigation", ["risk"]),
    make("design-enrich", ["risk"]),
    make("validation", ["mitigation", "design-enrich"]),
    make("reporting", ["validation"]),
  ];
}

describe("runPipeline", () => {
  it("runs Mitigation and Design-Enrich concurrently with overlapping execution windows", async () => {
    const windows: Record<string, { start: number; end: number }> = {};
    const recordingHandler = (name: string): AgentDescriptor["handler"] => async () => {
      const start = Date.now();
      await delay(50);
      windows[name] = { start, end: Date.now() };
      return { outputRefs: [] };
    };

    const agents = buildSevenAgentGraph({
      mitigation: recordingHandler("mitigation"),
      "design-enrich": recordingHandler("design-enrich"),
    });

    const ledger = new InMemoryPipelineStepsLedger();
    const result = await runPipeline({ runId: "run-1", agents, ledger });

    expect(result.finalStatuses.mitigation).toBe("succeeded");
    expect(result.finalStatuses["design-enrich"]).toBe("succeeded");

    const mitigation = windows.mitigation!;
    const designEnrich = windows["design-enrich"]!;
    const overlap = Math.min(mitigation.end, designEnrich.end) - Math.max(mitigation.start, designEnrich.start);
    expect(overlap).toBeGreaterThan(0);

    const steps = await ledger.listSteps("run-1");
    const mitigationStep = steps.find((s) => s.agentName === "mitigation")!;
    const designEnrichStep = steps.find((s) => s.agentName === "design-enrich")!;
    expect(mitigationStep.wave).toBe(designEnrichStep.wave);
  });

  it("cascades skipped status downstream when an upstream agent fails, while its wave siblings still complete", async () => {
    const agents = buildSevenAgentGraph({
      threat: async () => {
        throw new Error("threat agent exploded");
      },
    });

    const ledger = new InMemoryPipelineStepsLedger();
    const result = await runPipeline({ runId: "run-2", agents, ledger });

    expect(result.finalStatuses.architect).toBe("succeeded");
    expect(result.finalStatuses.threat).toBe("failed");
    expect(result.finalStatuses.risk).toBe("skipped");
    expect(result.finalStatuses.mitigation).toBe("skipped");
    expect(result.finalStatuses["design-enrich"]).toBe("skipped");
    expect(result.finalStatuses.validation).toBe("skipped");
    expect(result.finalStatuses.reporting).toBe("skipped");

    const steps = await ledger.listSteps("run-2");
    const riskStep = steps.find((s) => s.agentName === "risk")!;
    expect(riskStep.error).toMatch(/threat/);
  });

  it("resumes from the failed agent on rerun rather than recomputing already-succeeded agents", async () => {
    let architectCalls = 0;
    let threatCalls = 0;
    let shouldThreatFail = true;

    const agents = buildSevenAgentGraph({
      architect: async () => {
        architectCalls += 1;
        return { outputRefs: [] };
      },
      threat: async () => {
        threatCalls += 1;
        if (shouldThreatFail) throw new Error("transient failure");
        return { outputRefs: [] };
      },
    });

    const ledger = new InMemoryPipelineStepsLedger();

    const firstRun = await runPipeline({ runId: "run-3", agents, ledger });
    expect(firstRun.finalStatuses.architect).toBe("succeeded");
    expect(firstRun.finalStatuses.threat).toBe("failed");
    expect(architectCalls).toBe(1);
    expect(threatCalls).toBe(1);

    shouldThreatFail = false;
    const secondRun = await runPipeline({ runId: "run-3", agents, ledger });

    expect(architectCalls).toBe(1); // not recomputed
    expect(threatCalls).toBe(2); // retried
    expect(secondRun.finalStatuses.architect).toBe("succeeded");
    expect(secondRun.finalStatuses.threat).toBe("succeeded");
    expect(secondRun.finalStatuses.reporting).toBe("succeeded");
  });
});
