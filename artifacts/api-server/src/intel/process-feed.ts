import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { Db } from "../db/client.js";
import { intelFeedItems } from "../db/schema/intel.js";
import { fetchUrlText, extractPdfText } from "./fetch.js";
import { extractIntelSignals } from "./extract.js";
import { loadLatestProjectComponents } from "./project-components.js";
import { markIntelFeedFailed, markIntelFeedProcessed, persistIntelSignals } from "./persist.js";

export interface ProcessIntelFeedDeps {
  db: Db;
  llmClient: LLMClient;
  embeddingClient: EmbeddingClient;
  model?: string;
}

export async function processIntelFeed(deps: ProcessIntelFeedDeps, intelFeedItemId: string): Promise<void> {
  const model = deps.model ?? process.env.LLM_DEFAULT_MODEL ?? "claude-opus-5";

  const [feedItem] = await deps.db.select().from(intelFeedItems).where(eq(intelFeedItems.id, intelFeedItemId)).limit(1);
  if (!feedItem) throw new Error(`Intel feed item "${intelFeedItemId}" not found`);

  try {
    const documentText =
      feedItem.sourceType === "url"
        ? await fetchUrlText(feedItem.sourceRef)
        : await extractPdfText(await readFile(feedItem.sourceRef));

    const components = await loadLatestProjectComponents(deps.db, feedItem.projectId);

    const signals = await extractIntelSignals({
      db: deps.db,
      llmClient: deps.llmClient,
      embeddingClient: deps.embeddingClient,
      model,
      documentText,
      components,
    });

    await persistIntelSignals(deps.db, intelFeedItemId, signals);
    await markIntelFeedProcessed(deps.db, intelFeedItemId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markIntelFeedFailed(deps.db, intelFeedItemId, message);
  }
}
