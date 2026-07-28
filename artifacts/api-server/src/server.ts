import { AnthropicLLMClient } from "@intel-threat-modeller/llm-client";
import { buildApp } from "./app.js";
import { createDb } from "./db/client.js";
import { registerAllAgents } from "./agents/bootstrap.js";

async function main() {
  const db = createDb();
  registerAllAgents({ db, llmClient: new AnthropicLLMClient() });

  const app = await buildApp({ db });
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`api-server listening on :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
