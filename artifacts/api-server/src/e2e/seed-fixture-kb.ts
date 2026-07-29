import { like } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { techniqueChunks } from "../db/schema/technique-chunks.js";
import { oneHotVector } from "../test-utils/vector-fixtures.js";
import { E2E_QUERY_VECTOR_INDEX } from "./canned-embedding-client.js";

const CONTENT_HASH_PREFIX = "e2e-fixture-";

/**
 * Real KB ingestion (kb/ingest) needs a live Voyage API key to embed real MITRE technique
 * text, so it can't run in an e2e/CI environment with no API keys configured. Instead this
 * seeds a handful of fixture `technique_chunks` rows directly so the Threat agent's
 * retrieval-grounded generation and the intel-extraction pass have real rows to retrieve
 * and cite. The first row (index E2E_QUERY_VECTOR_INDEX) is what CannedEmbeddingClient's
 * fixed query vector always ranks closest, making it the deterministic top retrieval result
 * for every call regardless of query text or framework filter used elsewhere in the app.
 * Idempotent: re-running only inserts rows that aren't already present (by contentHash).
 */
export async function seedFixtureKb(db: Db): Promise<void> {
  const existing = await db
    .select({ contentHash: techniqueChunks.contentHash })
    .from(techniqueChunks)
    .where(like(techniqueChunks.contentHash, `${CONTENT_HASH_PREFIX}%`));
  const existingHashes = new Set(existing.map((r) => r.contentHash));

  const fixtures = [
    {
      techniqueId: "T9001",
      name: "Fixture Phishing Technique",
      tactic: "Initial Access",
      chunkText: "An adversary sends a phishing email to gain initial access to the target environment.",
      index: E2E_QUERY_VECTOR_INDEX,
    },
    {
      techniqueId: "T9002",
      name: "Fixture Valid Accounts Technique",
      tactic: "Defense Evasion",
      chunkText: "An adversary uses valid, compromised credentials to blend in with legitimate traffic.",
      index: E2E_QUERY_VECTOR_INDEX + 1,
    },
    {
      techniqueId: "T9003",
      name: "Fixture Data Exfiltration Technique",
      tactic: "Exfiltration",
      chunkText: "An adversary exfiltrates data over an existing command and control channel.",
      index: E2E_QUERY_VECTOR_INDEX + 2,
    },
  ];

  for (const fixture of fixtures) {
    const contentHash = `${CONTENT_HASH_PREFIX}${fixture.techniqueId}`;
    if (existingHashes.has(contentHash)) continue;
    await db.insert(techniqueChunks).values({
      techniqueId: fixture.techniqueId,
      framework: "enterprise",
      name: fixture.name,
      tactic: fixture.tactic,
      chunkType: "description",
      chunkText: fixture.chunkText,
      embedding: oneHotVector(fixture.index),
      metadata: {},
      contentHash,
    });
  }
}

export async function cleanupFixtureKb(db: Db): Promise<void> {
  await db.delete(techniqueChunks).where(like(techniqueChunks.contentHash, `${CONTENT_HASH_PREFIX}%`));
}
