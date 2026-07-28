import { eq } from "drizzle-orm";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { Db } from "../../db/client.js";
import type { AgentDescriptor } from "../../orchestrator/types.js";
import { pipelineRuns } from "../../db/schema/pipeline.js";
import { loadLatestSystemModelForRun } from "../threat/read-system-model.js";
import { loadRankedAttackPathsForSystemModel } from "../risk/read-risk-scores.js";
import { buildMitigationUserMessage, MITIGATION_SYSTEM_PROMPT } from "./prompt.js";
import { MitigationOutput } from "./schema.js";
import { persistMitigations } from "./persist.js";

export interface MitigationAgentDeps {
  db: Db;
  llmClient: LLMClient;
  model?: string;
}

export function createMitigationAgentDescriptor(deps: MitigationAgentDeps): AgentDescriptor {
  const model = deps.model ?? process.env.LLM_DEFAULT_MODEL ?? "claude-opus-5";

  return {
    name: "mitigation",
    dependsOn: ["risk"],
    outputs: ["MitigationRecommendation[]"],
    handler: async (ctx) => {
      const [run] = await deps.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, ctx.runId)).limit(1);
      if (!run) throw new Error(`Pipeline run "${ctx.runId}" not found`);

      const systemModel = await loadLatestSystemModelForRun(deps.db, ctx.runId);
      const rankedAttackPaths = await loadRankedAttackPathsForSystemModel(deps.db, systemModel.systemModelId);
      if (rankedAttackPaths.length === 0) return { outputRefs: [] };

      const validAttackPathIds = new Set(rankedAttackPaths.map((p) => p.id));
      const scoreByAttackPathId = new Map(rankedAttackPaths.map((p) => [p.id, p.score]));

      const { data } = await deps.llmClient.completeStructured({
        model,
        system: MITIGATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildMitigationUserMessage(rankedAttackPaths) }],
        schema: MitigationOutput,
        schemaName: "MitigationOutput",
        maxTokens: 4096,
      });

      const validCandidates = data.recommendations
        .map((c) => ({ ...c, attackPathIds: c.attackPathIds.filter((id) => validAttackPathIds.has(id)) }))
        .filter((c) => c.attackPathIds.length > 0);

      const mitigationIds = await persistMitigations(deps.db, systemModel.systemModelId, validCandidates, scoreByAttackPathId);
      return { outputRefs: mitigationIds.map((id) => `mitigation:${id}`) };
    },
  };
}
