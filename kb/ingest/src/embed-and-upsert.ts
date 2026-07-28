import { createHash } from "node:crypto";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { Db } from "@intel-threat-modeller/api-server/db/client";
import { techniqueChunks } from "@intel-threat-modeller/api-server/db/schema";
import type { RawChunk } from "./types.js";

const INSERT_BATCH_SIZE = 100;

export function contentHashOf(chunk: RawChunk): string {
  return createHash("sha256")
    .update(`${chunk.techniqueId}|${chunk.framework}|${chunk.chunkType}|${chunk.tactic}|${chunk.chunkText}`)
    .digest("hex");
}

export interface EmbedAndUpsertResult {
  inserted: number;
  skippedUnchanged: number;
}

export async function embedAndUpsert(
  db: Db,
  embeddingClient: EmbeddingClient,
  chunks: RawChunk[],
): Promise<EmbedAndUpsertResult> {
  const existingHashes = new Set(
    (await db.select({ contentHash: techniqueChunks.contentHash }).from(techniqueChunks)).map(
      (r) => r.contentHash,
    ),
  );

  const withHashes = chunks.map((chunk) => ({ chunk, contentHash: contentHashOf(chunk) }));
  const newOnes = withHashes.filter(({ contentHash }) => !existingHashes.has(contentHash));

  let inserted = 0;
  for (let i = 0; i < newOnes.length; i += INSERT_BATCH_SIZE) {
    const batch = newOnes.slice(i, i + INSERT_BATCH_SIZE);
    const embeddings = await embeddingClient.embed(batch.map((b) => b.chunk.chunkText));

    await db.insert(techniqueChunks).values(
      batch.map((b, idx) => ({
        techniqueId: b.chunk.techniqueId,
        framework: b.chunk.framework,
        name: b.chunk.name,
        tactic: b.chunk.tactic,
        chunkType: b.chunk.chunkType,
        chunkText: b.chunk.chunkText,
        embedding: embeddings[idx]!,
        metadata: {},
        contentHash: b.contentHash,
      })),
    );
    inserted += batch.length;
  }

  return { inserted, skippedUnchanged: chunks.length - newOnes.length };
}
