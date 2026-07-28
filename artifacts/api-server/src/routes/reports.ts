import type { FastifyInstance } from "fastify";
import type { Db } from "../db/client.js";
import { ReportsRepository } from "../repositories/reports.js";
import { ProjectsRepository } from "../repositories/projects.js";

export function registerReportRoutes(app: FastifyInstance, db: Db): void {
  const reportsRepo = new ReportsRepository(db);
  const projectsRepo = new ProjectsRepository(db);

  app.get("/projects/:id/reports", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectsRepo.findById(id);
    if (!project) return reply.code(404).send({ error: "Project not found" });
    return reportsRepo.listByProject(id);
  });
}
