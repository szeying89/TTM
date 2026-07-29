import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { MitreFramework } from "@intel-threat-modeller/contracts";
import type { Db } from "../db/client.js";
import { retrieveTechniqueChunks, type RetrievedChunk } from "../agents/threat/retrieval.js";
import { buildIntelExtractionUserMessage, INTEL_EXTRACTION_SYSTEM_PROMPT } from "./extract-prompt.js";
import { IntelExtractionOutput } from "./extract-schema.js";

const RETRIEVAL_TOP_K_PER_FRAMEWORK = 8;
const FRAMEWORKS: MitreFramework[] = ["enterprise", "ics", "atlas"];

export interface ExtractedSignal {
  signalType: string;
  relatedTechniqueIds: { techniqueId: string; framework: MitreFramework }[];
  relatedComponentIds: string[];
  severity: number;
  summary: string;
  confidence: number;
}

export interface ExtractIntelSignalsDeps {
  db: Db;
  llmClient: LLMClient;
  embeddingClient: EmbeddingClient;
  model: string;
  documentText: string;
  components: { id: string; name: string; type: string }[];
}

export async function extractIntelSignals(deps: ExtractIntelSignalsDeps): Promise<ExtractedSignal[]> {
  const chunkBatches = await Promise.all(
    FRAMEWORKS.map((framework) =>
      retrieveTechniqueChunks(deps.db, deps.embeddingClient, framework, deps.documentText, RETRIEVAL_TOP_K_PER_FRAMEWORK),
    ),
  );
  const allChunks: RetrievedChunk[] = chunkBatches.flat();
  if (allChunks.length === 0) return [];

  const chunkById = new Map(allChunks.map((c) => [c.chunkId, c]));
  const chunkFrameworkById = new Map<string, MitreFramework>();
  FRAMEWORKS.forEach((framework, i) => {
    for (const chunk of chunkBatches[i]!) chunkFrameworkById.set(chunk.chunkId, framework);
  });

  const validComponentIds = new Set(deps.components.map((c) => c.id));

  const { data } = await deps.llmClient.completeStructured({
    model: deps.model,
    system: INTEL_EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildIntelExtractionUserMessage(deps.documentText, allChunks, deps.components) }],
    schema: IntelExtractionOutput,
    schemaName: "IntelExtractionOutput",
    maxTokens: 4096,
  });

  const results: ExtractedSignal[] = [];
  for (const candidate of data.signals) {
    const validChunkIds = candidate.relatedTechniqueChunkIds.filter((id) => chunkById.has(id));
    if (validChunkIds.length === 0) continue;

    const relatedTechniqueIds = Array.from(
      new Map(
        validChunkIds.map((chunkId) => {
          const chunk = chunkById.get(chunkId)!;
          const framework = chunkFrameworkById.get(chunkId)!;
          return [`${framework}:${chunk.techniqueId}`, { techniqueId: chunk.techniqueId, framework }];
        }),
      ).values(),
    );

    results.push({
      signalType: candidate.signalType,
      relatedTechniqueIds,
      relatedComponentIds: (candidate.relatedComponentIds ?? []).filter((id) => validComponentIds.has(id)),
      severity: candidate.severity,
      summary: candidate.summary,
      confidence: candidate.confidence,
    });
  }

  return results;
}
