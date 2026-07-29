import { eq } from "drizzle-orm";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { Db } from "../../db/client.js";
import type { AgentDescriptor } from "../../orchestrator/types.js";
import { pipelineRuns } from "../../db/schema/pipeline.js";
import { loadLatestSystemModelForRun } from "./read-system-model.js";
import { runRulePack } from "./rule-pack.js";
import { generateStrideAttackPaths } from "./stride-generator.js";
import { runOtherThreatsSweep } from "./other-threats.js";
import { mergeAttackPaths } from "./merge.js";
import { persistAttackPaths } from "./persist.js";

export interface ThreatAgentDeps {
  db: Db;
  llmClient: LLMClient;
  embeddingClient: EmbeddingClient;
  model?: string;
  fastModel?: string;
}

export function createThreatAgentDescriptor(deps: ThreatAgentDeps): AgentDescriptor {
  const model = deps.model ?? process.env.LLM_DEFAULT_MODEL ?? "claude-opus-5";
  const fastModel = deps.fastModel ?? process.env.LLM_FAST_MODEL ?? "claude-sonnet-5";

  return {
    name: "threat",
    dependsOn: ["architect"],
    outputs: ["AttackPath[]"],
    handler: async (ctx) => {
      const [run] = await deps.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, ctx.runId)).limit(1);
      if (!run) throw new Error(`Pipeline run "${ctx.runId}" not found`);

      const systemModel = await loadLatestSystemModelForRun(deps.db, ctx.runId);

      const rulePackResults = await runRulePack({ db: deps.db, framework: run.framework, systemModel });

      const strideResults = await generateStrideAttackPaths({
        db: deps.db,
        llmClient: deps.llmClient,
        embeddingClient: deps.embeddingClient,
        model,
        framework: run.framework,
        systemModel,
      });

      const alreadyCoveredTechniqueIds = new Set(
        [...rulePackResults, ...strideResults].flatMap((p) => p.groundingRefs.map((r) => r.techniqueId)),
      );

      const otherThreatsResults = await runOtherThreatsSweep({
        db: deps.db,
        llmClient: deps.llmClient,
        embeddingClient: deps.embeddingClient,
        model: fastModel,
        framework: run.framework,
        systemModel,
        alreadyCoveredTechniqueIds,
      });

      const merged = mergeAttackPaths([rulePackResults, strideResults, otherThreatsResults]);
      const attackPathIds = await persistAttackPaths(deps.db, systemModel.systemModelId, merged);

      return { outputRefs: attackPathIds.map((id) => `attack_path:${id}`) };
    },
  };
}
