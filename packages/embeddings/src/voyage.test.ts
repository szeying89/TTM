import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { VoyageEmbeddingClient } from "./voyage.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("VoyageEmbeddingClient", () => {
  it("requests embeddings for each text and returns them in input order", async () => {
    let capturedBody: { model: string; input: string[] };
    server.use(
      http.post("https://api.voyageai.com/v1/embeddings", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          data: capturedBody.input.map((_: string, index: number) => ({
            embedding: [index, index + 1],
            index,
          })),
        });
      }),
    );

    const client = new VoyageEmbeddingClient("test-key", "voyage-3-large");
    const result = await client.embed(["alpha", "beta"]);

    expect(capturedBody.model).toBe("voyage-3-large");
    expect(capturedBody.input).toEqual(["alpha", "beta"]);
    expect(result).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(client.dimensions).toBe(1024);
  });

  it("batches requests larger than 128 texts", async () => {
    let requestCount = 0;
    server.use(
      http.post("https://api.voyageai.com/v1/embeddings", async ({ request }) => {
        requestCount += 1;
        const body = (await request.json()) as { input: string[] };
        return HttpResponse.json({
          data: body.input.map((_, index) => ({ embedding: [index], index })),
        });
      }),
    );

    const client = new VoyageEmbeddingClient("test-key", "voyage-3-large");
    const texts = Array.from({ length: 200 }, (_, i) => `text-${i}`);
    const result = await client.embed(texts);

    expect(requestCount).toBe(2);
    expect(result).toHaveLength(200);
  });

  it("throws on a non-ok response", async () => {
    server.use(
      http.post("https://api.voyageai.com/v1/embeddings", () =>
        HttpResponse.text("bad request", { status: 400 }),
      ),
    );
    const client = new VoyageEmbeddingClient("test-key", "voyage-3-large");
    await expect(client.embed(["x"])).rejects.toThrow(/failed/);
  });
});

describe.skipIf(process.env.RUN_LIVE_API_TESTS !== "1")("VoyageEmbeddingClient (live)", () => {
  it("embeds a real string against the Voyage API", async () => {
    const client = new VoyageEmbeddingClient();
    const result = await client.embed(["phishing via spoofed email"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(client.dimensions);
  });
});
