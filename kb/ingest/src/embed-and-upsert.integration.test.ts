import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "@intel-threat-modeller/api-server/db/schema";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import { embedAndUpsert } from "./embed-and-upsert.js";
import type { RawChunk } from "./types.js";

const runIntegration = !!process.env.DATABASE_URL;

class FakeEmbeddingClient implements EmbeddingClient {
  readonly dimensions = 1024;
  calls = 0;

  async embed(texts: string[]): Promise<number[][]> {
    this.calls += 1;
    return texts.map(() => Array.from({ length: this.dimensions }, () => 0));
  }
}

describe.skipIf(!runIntegration)("embedAndUpsert (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.query("DELETE FROM technique_chunks WHERE technique_id = 'TEST-KB-1'");
    await pool.end();
  });

  it("inserts new chunks and skips unchanged ones on a second run", async () => {
    const chunks: RawChunk[] = [
      {
        techniqueId: "TEST-KB-1",
        framework: "enterprise",
        name: "Test Technique",
        tactic: "Initial Access",
        chunkType: "description",
        chunkText: "A description for the integration test technique.",
      },
    ];

    const embeddingClient = new FakeEmbeddingClient();

    const first = await embedAndUpsert(db, embeddingClient, chunks);
    expect(first.inserted).toBe(1);
    expect(first.skippedUnchanged).toBe(0);

    const second = await embedAndUpsert(db, embeddingClient, chunks);
    expect(second.inserted).toBe(0);
    expect(second.skippedUnchanged).toBe(1);

    const rows = await db
      .select()
      .from(schema.techniqueChunks)
      .where(sql`technique_id = 'TEST-KB-1'`);
    expect(rows).toHaveLength(1);
  });
});
