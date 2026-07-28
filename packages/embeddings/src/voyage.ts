import type { EmbeddingClient } from "./types.js";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 128;
const MODEL_DIMENSIONS: Record<string, number> = {
  "voyage-3-large": 1024,
};

interface VoyageEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

export class VoyageEmbeddingClient implements EmbeddingClient {
  readonly dimensions: number;

  constructor(
    private readonly apiKey: string = process.env.VOYAGE_API_KEY ?? "",
    private readonly model: string = "voyage-3-large",
  ) {
    const dims = MODEL_DIMENSIONS[model];
    if (!dims) {
      throw new Error(`Unknown Voyage embedding model dimensions for "${model}"`);
    }
    this.dimensions = dims;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await fetch(VOYAGE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ input: batch, model: this.model }),
      });

      if (!response.ok) {
        throw new Error(`Voyage embeddings request failed: ${response.status} ${await response.text()}`);
      }

      const body = (await response.json()) as VoyageEmbeddingResponse;
      const sorted = [...body.data].sort((a, b) => a.index - b.index);
      results.push(...sorted.map((d) => d.embedding));
    }
    return results;
  }
}
