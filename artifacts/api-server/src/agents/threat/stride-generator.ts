import { randomUUID } from "node:crypto";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { AttackPath, MitreFramework } from "@intel-threat-modeller/contracts";
import type { Db } from "../../db/client.js";
import type { LoadedSystemModel } from "./read-system-model.js";
import { retrieveTechniqueChunks } from "./retrieval.js";
import { STRIDE_GENERATOR_SYSTEM_PROMPT, buildStrideGeneratorUserMessage } from "./stride-generator-prompt.js";
import { StrideGeneratorOutput } from "./stride-generator-schema.js";
import { computeGroupKey } from "./group-key.js";
import { sortKillChainStages } from "./stride-taxonomy.js";

const RETRIEVAL_TOP_K = 10;

export interface StrideGeneratorDeps {
  db: Db;
  llmClient: LLMClient;
  embeddingClient: EmbeddingClient;
  model: string;
  framework: MitreFramework;
  systemModel: LoadedSystemModel;
}

export async function generateStrideAttackPaths(deps: StrideGeneratorDeps): Promise<AttackPath[]> {
  const validComponentIds = new Set(deps.systemModel.components.map((c) => c.id));
  const results: AttackPath[] = [];

  for (const component of deps.systemModel.components) {
    const queryText = `${component.name}: ${component.description} Technologies: ${component.technologies.join(", ")}`;
    const chunks = await retrieveTechniqueChunks(deps.db, deps.embeddingClient, deps.framework, queryText, RETRIEVAL_TOP_K);
    if (chunks.length === 0) continue;

    const validChunkIds = new Map(chunks.map((c) => [c.chunkId, c]));

    const { data } = await deps.llmClient.completeStructured({
      model: deps.model,
      system: STRIDE_GENERATOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildStrideGeneratorUserMessage(component, deps.systemModel, chunks) }],
      schema: StrideGeneratorOutput,
      schemaName: "StrideGeneratorOutput",
      maxTokens: 4096,
    });

    for (const candidate of data.attackPaths) {
      const validGroundingRefs = candidate.groundingRefs
        .filter((ref) => validChunkIds.has(ref.chunkId))
        .map((ref) => {
          const chunk = validChunkIds.get(ref.chunkId)!;
          return {
            techniqueId: chunk.techniqueId,
            framework: deps.framework,
            chunkId: ref.chunkId,
            retrievalScore: 1,
          };
        });
      if (validGroundingRefs.length === 0) continue;

      const validEntities = candidate.entities.filter((e) => validComponentIds.has(e.componentId));
      if (validEntities.length === 0) continue;

      results.push({
        id: randomUUID(),
        name: candidate.name,
        sourcePass: "stride-llm",
        strideCategories: candidate.strideCategories,
        entities: validEntities,
        killChainStages: sortKillChainStages(deps.framework, candidate.killChainStages ?? []),
        groupKey: computeGroupKey(
          validEntities.map((e) => e.componentId),
          validGroundingRefs[0]!.techniqueId,
        ),
        groundingRefs: validGroundingRefs,
        applicability: "applicable",
      });
    }
  }

  return results;
}
