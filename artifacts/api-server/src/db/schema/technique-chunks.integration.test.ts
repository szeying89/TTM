import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { techniqueChunks } from "./technique-chunks.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("technique_chunks (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("round-trips an embedding vector through insert and cosine-distance query", async () => {
    const embedding = Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0));

    await db.insert(techniqueChunks).values({
      techniqueId: "T1566",
      framework: "enterprise",
      name: "Phishing",
      tactic: "initial-access",
      chunkType: "description",
      chunkText: "Adversaries may send phishing messages to gain access to victim systems.",
      embedding,
      contentHash: "test-hash-1",
    });

    const closeQuery = Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0));
    const rows = await db
      .select({ techniqueId: techniqueChunks.techniqueId })
      .from(techniqueChunks)
      .orderBy(sql`embedding <=> ${`[${closeQuery.join(",")}]`}`)
      .limit(1);

    expect(rows[0]?.techniqueId).toBe("T1566");

    await db.delete(techniqueChunks).where(sql`content_hash = 'test-hash-1'`);
  });
});
