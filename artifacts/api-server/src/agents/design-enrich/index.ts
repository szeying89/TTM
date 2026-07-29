import { eq } from "drizzle-orm";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { Db } from "../../db/client.js";
import type { AgentDescriptor } from "../../orchestrator/types.js";
import { pipelineRuns } from "../../db/schema/pipeline.js";
import { loadLatestSystemModelForRun } from "../threat/read-system-model.js";
import { loadRankedAttackPathsForSystemModel } from "../risk/read-risk-scores.js";
import { buildDesignEnrichUserMessage, DESIGN_ENRICH_SYSTEM_PROMPT } from "./prompt.js";
import { DesignEnrichOutput } from "./schema.js";
import { persistDesignEnrichment } from "./persist.js";

export interface DesignEnrichAgentDeps {
  db: Db;
  llmClient: LLMClient;
  model?: string;
}

export function createDesignEnrichAgentDescriptor(deps: DesignEnrichAgentDeps): AgentDescriptor {
  const model = deps.model ?? process.env.LLM_DEFAULT_MODEL ?? "claude-opus-5";

  return {
    name: "design-enrich",
    dependsOn: ["risk"],
    outputs: ["Assumption[]", "DesignDelta[]"],
    handler: async (ctx) => {
      const [run] = await deps.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, ctx.runId)).limit(1);
      if (!run) throw new Error(`Pipeline run "${ctx.runId}" not found`);

      const systemModel = await loadLatestSystemModelForRun(deps.db, ctx.runId);
      const rankedAttackPaths = await loadRankedAttackPathsForSystemModel(deps.db, systemModel.systemModelId);

      const { data } = await deps.llmClient.completeStructured({
        model,
        system: DESIGN_ENRICH_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildDesignEnrichUserMessage(systemModel, rankedAttackPaths) }],
        schema: DesignEnrichOutput,
        schemaName: "DesignEnrichOutput",
        maxTokens: 4096,
      });

      const validComponentIds = new Set(systemModel.components.map((c) => c.id));
      const validAssumptions = data.assumptions.map((a) => ({
        ...a,
        relatedComponentIds: (a.relatedComponentIds ?? []).filter((id) => validComponentIds.has(id)),
      }));

      const { assumptionIds, designDeltaIds } = await persistDesignEnrichment(
        deps.db,
        systemModel.systemModelId,
        validAssumptions,
        data.designDeltas,
      );

      return {
        outputRefs: [
          ...assumptionIds.map((id) => `assumption:${id}`),
          ...designDeltaIds.map((id) => `design_delta:${id}`),
        ],
      };
    },
  };
}
