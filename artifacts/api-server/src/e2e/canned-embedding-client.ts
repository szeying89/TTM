import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import { oneHotVector } from "../test-utils/vector-fixtures.js";

/** Must match the index used to seed the primary fixture chunk in seed-fixture-kb.ts. */
export const E2E_QUERY_VECTOR_INDEX = 900;

/**
 * Returns the same fixed vector for every input, regardless of query text. This makes
 * pgvector's cosine-distance ordering against `technique_chunks` identical across every
 * retrieval call: the fixture chunk seeded at E2E_QUERY_VECTOR_INDEX (see seed-fixture-kb.ts)
 * is always the closest match, so the Threat agent's groundingRefs and the intel-extraction
 * pass's relatedTechniqueChunkIds are guaranteed to cite the same technique without needing
 * live embeddings or a real ingested KB.
 */
export class CannedEmbeddingClient implements EmbeddingClient {
  readonly dimensions = 1024;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => oneHotVector(E2E_QUERY_VECTOR_INDEX, this.dimensions));
  }
}
