import type { AgentDescriptor, PipelineStepsLedger } from "./types.js";
import { buildWaves } from "./waves.js";

export interface RunPipelineOptions {
  runId: string;
  agents: AgentDescriptor[];
  ledger: PipelineStepsLedger;
}

export interface RunPipelineResult {
  waves: string[][];
  finalStatuses: Record<string, "succeeded" | "failed" | "skipped">;
}

export async function runPipeline({ runId, agents, ledger }: RunPipelineOptions): Promise<RunPipelineResult> {
  const waves = buildWaves(agents);
  const byName = new Map(agents.map((a) => [a.name, a]));
  const finalStatuses: Record<string, "succeeded" | "failed" | "skipped"> = {};

  for (let waveIndex = 0; waveIndex < waves.length; waveIndex += 1) {
    const waveAgentNames = waves[waveIndex]!;

    // An agent is skipped for this run if any of its (possibly transitive,
    // already-resolved) dependencies did not succeed.
    const runnable = waveAgentNames.filter((name) => {
      const descriptor = byName.get(name)!;
      return descriptor.dependsOn.every((dep) => finalStatuses[dep] === "succeeded");
    });
    const skippedUpfront = waveAgentNames.filter((name) => !runnable.includes(name));

    await Promise.all(
      skippedUpfront.map(async (name) => {
        const descriptor = byName.get(name)!;
        const failedDep = descriptor.dependsOn.find((dep) => finalStatuses[dep] !== "succeeded");
        const step = await ledger.createStep({
          runId,
          agentName: name,
          wave: waveIndex,
          dependsOn: descriptor.dependsOn,
        });
        await ledger.markSkipped(step.id, `Upstream dependency "${failedDep}" did not succeed`);
        finalStatuses[name] = "skipped";
      }),
    );

    await Promise.allSettled(
      runnable.map(async (name) => {
        const descriptor = byName.get(name)!;

        // Resumability: an already-succeeded step for this (runId, agentName)
        // is not recomputed.
        const existing = await ledger.findSucceededStep(runId, name);
        if (existing) {
          finalStatuses[name] = "succeeded";
          return;
        }

        const step = await ledger.createStep({
          runId,
          agentName: name,
          wave: waveIndex,
          dependsOn: descriptor.dependsOn,
        });
        await ledger.markRunning(step.id);

        try {
          const result = await descriptor.handler({ runId });
          await ledger.markSucceeded(step.id, result.outputRefs);
          finalStatuses[name] = "succeeded";
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await ledger.markFailed(step.id, message);
          finalStatuses[name] = "failed";
        }
      }),
    );
  }

  return { waves, finalStatuses };
}
