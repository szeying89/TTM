import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import { processIntelFeed } from "./process-feed.js";
import { buildMinimalPdf } from "./test-fixtures/build-minimal-pdf.js";

const runIntegration = !!process.env.DATABASE_URL;
const server = setupServer();

class ZeroEmbeddingClient implements EmbeddingClient {
  readonly dimensions = 1024;
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => Array.from({ length: 1024 }, () => 0));
  }
}

class EmptySignalsLLMClient implements LLMClient {
  async complete(): Promise<never> {
    throw new Error("not used");
  }
  async completeStructured<T>(_req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
    return { data: { signals: [] } as T, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

describe.skipIf(!runIntegration)("processIntelFeed (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let projectId: string;
  let uploadsDir: string;

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    uploadsDir = await mkdtemp(path.join(tmpdir(), "intel-process-"));
  });

  afterAll(async () => {
    await pool.end();
    await rm(uploadsDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const [project] = await db.insert(schema.projects).values({ name: "Intel process test" }).returning();
    projectId = project!.id;
  });

  it("marks a URL feed processed when the page fetches and parses successfully", async () => {
    server.use(
      http.get("https://example.com/ok-advisory", () =>
        HttpResponse.html(`<html><body><article><h1>Advisory</h1><p>${"Detailed advisory text describing an incident. ".repeat(10)}</p></article></body></html>`),
      ),
    );
    const [item] = await db
      .insert(schema.intelFeedItems)
      .values({ projectId, sourceType: "url", sourceRef: "https://example.com/ok-advisory", status: "pending" })
      .returning();

    await processIntelFeed({ db, llmClient: new EmptySignalsLLMClient(), embeddingClient: new ZeroEmbeddingClient() }, item!.id);

    const [updated] = await db.select().from(schema.intelFeedItems).where(eq(schema.intelFeedItems.id, item!.id)).limit(1);
    expect(updated?.status).toBe("processed");
  });

  it("marks a URL feed failed (without throwing) when the URL is unreachable", async () => {
    server.use(http.get("https://example.com/gone", () => HttpResponse.text("nope", { status: 500 })));
    const [item] = await db
      .insert(schema.intelFeedItems)
      .values({ projectId, sourceType: "url", sourceRef: "https://example.com/gone", status: "pending" })
      .returning();

    await expect(
      processIntelFeed({ db, llmClient: new EmptySignalsLLMClient(), embeddingClient: new ZeroEmbeddingClient() }, item!.id),
    ).resolves.toBeUndefined();

    const [updated] = await db.select().from(schema.intelFeedItems).where(eq(schema.intelFeedItems.id, item!.id)).limit(1);
    expect(updated?.status).toBe("failed");
    expect(updated?.failureReason).toBeTruthy();
  });

  it("marks a PDF feed processed for a valid PDF", async () => {
    const pdfPath = path.join(uploadsDir, "advisory.pdf");
    await writeFile(pdfPath, buildMinimalPdf("A detailed security advisory about active exploitation."));

    const [item] = await db
      .insert(schema.intelFeedItems)
      .values({ projectId, sourceType: "pdf", sourceRef: pdfPath, status: "pending" })
      .returning();

    await processIntelFeed({ db, llmClient: new EmptySignalsLLMClient(), embeddingClient: new ZeroEmbeddingClient() }, item!.id);

    const [updated] = await db.select().from(schema.intelFeedItems).where(eq(schema.intelFeedItems.id, item!.id)).limit(1);
    expect(updated?.status).toBe("processed");
  });

  it("marks a PDF feed failed (without throwing) for an unparsable file", async () => {
    const pdfPath = path.join(uploadsDir, "not-a-real.pdf");
    await writeFile(pdfPath, Buffer.from("this is not a pdf"));

    const [item] = await db
      .insert(schema.intelFeedItems)
      .values({ projectId, sourceType: "pdf", sourceRef: pdfPath, status: "pending" })
      .returning();

    await expect(
      processIntelFeed({ db, llmClient: new EmptySignalsLLMClient(), embeddingClient: new ZeroEmbeddingClient() }, item!.id),
    ).resolves.toBeUndefined();

    const [updated] = await db.select().from(schema.intelFeedItems).where(eq(schema.intelFeedItems.id, item!.id)).limit(1);
    expect(updated?.status).toBe("failed");
    expect(updated?.failureReason).toBeTruthy();
  });
});
