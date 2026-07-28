import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { Db } from "./db/client.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerPipelineRunRoutes } from "./routes/pipeline-runs.js";
import { registerIntelFeedRoutes } from "./routes/intel-feeds.js";
import { registerReportRoutes } from "./routes/reports.js";

export interface BuildAppOptions {
  db: Db;
  uploadsDir?: string;
  llmClient?: LLMClient;
  embeddingClient?: EmbeddingClient;
}

export async function buildApp({ db, uploadsDir, llmClient, embeddingClient }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(multipart);

  registerProjectRoutes(app, db);
  registerPipelineRunRoutes(app, db);
  registerIntelFeedRoutes(app, db, { uploadsDir, llmClient, embeddingClient });
  registerReportRoutes(app, db);

  return app;
}
