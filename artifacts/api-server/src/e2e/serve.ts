import { buildApp } from "../app.js";
import { createDb } from "../db/client.js";
import { registerAllAgents } from "../agents/bootstrap.js";
import { CannedLLMClient } from "./canned-llm-client.js";
import { CannedEmbeddingClient } from "./canned-embedding-client.js";
import { seedFixtureKb } from "./seed-fixture-kb.js";

/**
 * Boots the real api-server (real Postgres, real orchestrator, real agent handlers) but wired
 * to CannedLLMClient/CannedEmbeddingClient instead of live Anthropic/Voyage calls, so a
 * complete pipeline run finishes deterministically and near-instantly. Used by the frontend's
 * Playwright e2e suite (see frontend/playwright.config.ts) and by any CI "fast path" job -
 * never used against a real project's data.
 */
async function main() {
  const db = createDb();
  await seedFixtureKb(db);
  const llmClient = new CannedLLMClient();
  const embeddingClient = new CannedEmbeddingClient();
  registerAllAgents({ db, llmClient, embeddingClient });

  const app = await buildApp({ db, llmClient, embeddingClient });
  const port = Number(process.env.E2E_API_PORT ?? 4100);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`e2e api-server (canned LLM/embeddings) listening on :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
