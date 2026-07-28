import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { ProjectsRepository } from "../repositories/projects.js";

const CreateProjectBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criMaturity: z.record(z.string(), z.string()).optional(),
});

const DesignDocBody = z.object({
  prose: z.string().default(""),
  mermaidText: z.string().default(""),
});

export function registerProjectRoutes(app: FastifyInstance, db: Db): void {
  const repo = new ProjectsRepository(db);

  app.post("/projects", async (request, reply) => {
    const body = CreateProjectBody.parse(request.body);
    const project = await repo.create(body);
    return reply.code(201).send(project);
  });

  app.get("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await repo.findById(id);
    if (!project) return reply.code(404).send({ error: "Project not found" });
    return project;
  });

  app.post("/projects/:id/design-doc", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await repo.findById(id);
    if (!project) return reply.code(404).send({ error: "Project not found" });

    const body = DesignDocBody.parse(request.body);
    const doc = await repo.addDesignDoc(id, body.prose, body.mermaidText);
    return reply.code(201).send(doc);
  });
}
