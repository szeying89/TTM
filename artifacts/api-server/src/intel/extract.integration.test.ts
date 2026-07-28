import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema/index.js";
import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import { extractIntelSignals } from "./extract.js";
import { oneHotVector } from "../test-utils/vector-fixtures.js";

const runIntegration = !!process.env.DATABASE_URL;

class FixedEmbeddingClient implements EmbeddingClient {
  readonly dimensions = 1024;
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => oneHotVector(3));
  }
}

describe.skipIf(!runIntegration)("extractIntelSignals (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let phishingChunkId: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    const [row] = await db
      .insert(schema.techniqueChunks)
      .values({
        techniqueId: "T1566",
        framework: "enterprise",
        name: "Phishing",
        tactic: "Initial Access",
        chunkType: "description",
        chunkText: "Adversaries send phishing messages to gain initial access.",
        embedding: oneHotVector(3),
        contentHash: `test-t1566-${Math.random()}`,
      })
      .returning();
    phishingChunkId = row!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("resolves a signal grounded in a real retrieved chunk and links a real component", async () => {
    class MockLLMClient implements LLMClient {
      async complete(): Promise<never> {
        throw new Error("not used");
      }
      async completeStructured<T>(_req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
        const data = {
          signals: [
            {
              signalType: "active-exploitation",
              relatedTechniqueChunkIds: [phishingChunkId, "chunk-that-does-not-exist"],
              relatedComponentIds: ["browser-1", "unknown-component"],
              severity: 0.8,
              summary: "Active phishing campaign observed targeting this system's users.",
              confidence: 0.9,
            },
          ],
        };
        return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
      }
    }

    const signals = await extractIntelSignals({
      db,
      llmClient: new MockLLMClient(),
      embeddingClient: new FixedEmbeddingClient(),
      model: "claude-opus-5",
      documentText: "A phishing campaign is actively exploiting users of this application.",
      components: [{ id: "browser-1", name: "Browser", type: "actor" }],
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]?.relatedTechniqueIds).toEqual([{ techniqueId: "T1566", framework: "enterprise" }]);
    expect(signals[0]?.relatedComponentIds).toEqual(["browser-1"]);
    expect(signals[0]?.signalType).toBe("active-exploitation");
  });

  it("drops a signal whose only cited chunk id is not in the retrieved set", async () => {
    class MockLLMClient implements LLMClient {
      async complete(): Promise<never> {
        throw new Error("not used");
      }
      async completeStructured<T>(_req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
        const data = {
          signals: [
            {
              signalType: "other",
              relatedTechniqueChunkIds: ["totally-invented-chunk-id"],
              relatedComponentIds: [],
              severity: 0.5,
              summary: "Invented finding.",
              confidence: 0.5,
            },
          ],
        };
        return { data: data as T, usage: { inputTokens: 0, outputTokens: 0 } };
      }
    }

    const signals = await extractIntelSignals({
      db,
      llmClient: new MockLLMClient(),
      embeddingClient: new FixedEmbeddingClient(),
      model: "claude-opus-5",
      documentText: "Unrelated content.",
      components: [],
    });

    expect(signals).toHaveLength(0);
  });
});
