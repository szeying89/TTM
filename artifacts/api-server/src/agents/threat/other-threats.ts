import { randomUUID } from "node:crypto";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { AttackPath, MitreFramework } from "@intel-threat-modeller/contracts";
import type { Db } from "../../db/client.js";
import type { LoadedSystemModel } from "./read-system-model.js";
import { retrieveTechniqueChunks } from "./retrieval.js";
import { buildOtherThreatsUserMessage, OTHER_THREATS_SYSTEM_PROMPT } from "./other-threats-prompt.js";
import { OtherThreatsOutput } from "./other-threats-schema.js";
import { computeGroupKey } from "./group-key.js";
import { sortKillChainStages } from "./stride-taxonomy.js";

const SWEEP_TOP_K = 20;

export interface OtherThreatsDeps {
  db: Db;
  llmClient: LLMClient;
  embeddingClient: EmbeddingClient;
  model: string;
  framework: MitreFramework;
  systemModel: LoadedSystemModel;
  alreadyCoveredTechniqueIds: Set<string>;
}

export async function runOtherThreatsSweep(deps: OtherThreatsDeps): Promise<AttackPath[]> {
  const querySummary = deps.systemModel.components
    .map((c) => `${c.name}: ${c.description}`)
    .join(". ");
  const chunks = await retrieveTechniqueChunks(deps.db, deps.embeddingClient, deps.framework, querySummary, SWEEP_TOP_K);
  const uncovered = chunks.filter((c) => !deps.alreadyCoveredTechniqueIds.has(c.techniqueId));
  if (uncovered.length === 0) return [];

  const chunkById = new Map(uncovered.map((c) => [c.chunkId, c]));
  const validComponentIds = new Set(deps.systemModel.components.map((c) => c.id));

  const { data } = await deps.llmClient.completeStructured({
    model: deps.model,
    system: OTHER_THREATS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildOtherThreatsUserMessage(deps.systemModel, uncovered) }],
    schema: OtherThreatsOutput,
    schemaName: "OtherThreatsOutput",
    maxTokens: 8192,
  });

  const results: AttackPath[] = [];
  for (const decision of data.decisions) {
    const chunk = chunkById.get(decision.chunkId);
    if (!chunk) continue;

    const validEntities = decision.entities.filter((e) => validComponentIds.has(e.componentId));
    if (validEntities.length === 0) continue;

    const groundingRefs = [{ techniqueId: chunk.techniqueId, framework: deps.framework, chunkId: chunk.chunkId, retrievalScore: 1 }];
    const groupKey = computeGroupKey(
      validEntities.map((e) => e.componentId),
      chunk.techniqueId,
    );

    const strideCategories = decision.strideCategories ?? [];
    const killChainStages = decision.killChainStages ?? [];

    if (decision.decision === "not-applicable") {
      if (!decision.notApplicableRationale?.trim()) continue;
      results.push({
        id: randomUUID(),
        name: decision.name,
        sourcePass: "other-threats",
        strideCategories: strideCategories.length > 0 ? strideCategories : ["information-disclosure"],
        entities: validEntities,
        killChainStages: sortKillChainStages(deps.framework, killChainStages),
        groupKey,
        groundingRefs,
        applicability: "not-applicable",
        notApplicableRationaleCategory: decision.notApplicableRationaleCategory,
        notApplicableRationale: decision.notApplicableRationale,
      });
    } else {
      if (strideCategories.length === 0) continue;
      results.push({
        id: randomUUID(),
        name: decision.name,
        sourcePass: "other-threats",
        strideCategories,
        entities: validEntities,
        killChainStages: sortKillChainStages(deps.framework, killChainStages),
        groupKey,
        groundingRefs,
        applicability: "applicable",
      });
    }
  }

  return results;
}
