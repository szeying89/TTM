import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { Db } from "../db/client.js";
import { IntelFeedsRepository } from "../repositories/intel-feeds.js";
import { ProjectsRepository } from "../repositories/projects.js";
import { processIntelFeed } from "../intel/process-feed.js";

const UrlFeedBody = z.object({ url: z.string().url() });

export interface IntelFeedRouteOptions {
  uploadsDir?: string;
  llmClient?: LLMClient;
  embeddingClient?: EmbeddingClient;
}

export function registerIntelFeedRoutes(app: FastifyInstance, db: Db, options: IntelFeedRouteOptions = {}): void {
  const uploadsDir = options.uploadsDir ?? path.join(process.cwd(), "uploads", "intel-feeds");
  const projectsRepo = new ProjectsRepository(db);
  const intelFeedsRepo = new IntelFeedsRepository(db);

  const triggerProcessing = (intelFeedItemId: string) => {
    if (!options.llmClient || !options.embeddingClient) return;
    void processIntelFeed({ db, llmClient: options.llmClient, embeddingClient: options.embeddingClient }, intelFeedItemId);
  };

  app.post("/projects/:id/intel-feeds", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectsRepo.findById(id);
    if (!project) return reply.code(404).send({ error: "Project not found" });

    if (request.isMultipart()) {
      const file = await request.file();
      if (!file) return reply.code(400).send({ error: "No file provided" });
      if (file.mimetype !== "application/pdf") {
        return reply.code(400).send({ error: "Only application/pdf uploads are supported" });
      }

      await mkdir(uploadsDir, { recursive: true });
      const storedFilePath = path.join(uploadsDir, `${randomUUID()}.pdf`);
      const buffer = await file.toBuffer();
      await writeFile(storedFilePath, buffer);

      const item = await intelFeedsRepo.createPdfFeed(id, storedFilePath);
      triggerProcessing(item.id);
      return reply.code(201).send(item);
    }

    const body = UrlFeedBody.parse(request.body);
    const item = await intelFeedsRepo.createUrlFeed(id, body.url);
    triggerProcessing(item.id);
    return reply.code(201).send(item);
  });

  app.get("/projects/:id/intel-feeds", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectsRepo.findById(id);
    if (!project) return reply.code(404).send({ error: "Project not found" });
    return intelFeedsRepo.listByProject(id);
  });

  app.get("/intel-feeds/:feedId/signals", async (request, reply) => {
    const { feedId } = request.params as { feedId: string };
    const feed = await intelFeedsRepo.findById(feedId);
    if (!feed) return reply.code(404).send({ error: "Intel feed item not found" });
    return intelFeedsRepo.listSignals(feedId);
  });
}
