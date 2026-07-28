import { eq, sql } from "drizzle-orm";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { MitreFramework } from "@intel-threat-modeller/contracts";
import type { Db } from "../../db/client.js";
import { techniqueChunks } from "../../db/schema/technique-chunks.js";

export interface RetrievedChunk {
  chunkId: string;
  techniqueId: string;
  name: string;
  tactic: string;
  chunkType: string;
  chunkText: string;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function retrieveTechniqueChunks(
  db: Db,
  embeddingClient: EmbeddingClient,
  framework: MitreFramework,
  queryText: string,
  topK: number,
): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await embeddingClient.embed([queryText]);
  if (!queryEmbedding) return [];

  const vectorLiteral = toVectorLiteral(queryEmbedding);
  const rows = await db
    .select({
      chunkId: techniqueChunks.id,
      techniqueId: techniqueChunks.techniqueId,
      name: techniqueChunks.name,
      tactic: techniqueChunks.tactic,
      chunkType: techniqueChunks.chunkType,
      chunkText: techniqueChunks.chunkText,
    })
    .from(techniqueChunks)
    .where(eq(techniqueChunks.framework, framework))
    .orderBy(sql`${techniqueChunks.embedding} <=> ${vectorLiteral}`)
    .limit(topK);

  return rows;
}
