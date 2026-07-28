import type { FastifyInstance } from "fastify";
import type { Db } from "../db/client.js";
import { getRegistry } from "../agents/registry.js";
import { DrizzlePipelineStepsLedger } from "../orchestrator/drizzle-ledger.js";
import { runPipeline } from "../orchestrator/runPipeline.js";
import { PipelineRunsRepository } from "../repositories/pipeline-runs.js";
import { ProjectsRepository } from "../repositories/projects.js";

async function executeRun(db: Db, runId: string): Promise<void> {
  const runsRepo = new PipelineRunsRepository(db);
  const ledger = new DrizzlePipelineStepsLedger(db);

  await runsRepo.markRunning(runId);
  try {
    const result = await runPipeline({ runId, agents: getRegistry(), ledger });
    const anyFailed = Object.values(result.finalStatuses).some((s) => s === "failed");
    await runsRepo.markFinished(runId, anyFailed ? "failed" : "succeeded");
  } catch {
    await runsRepo.markFinished(runId, "failed");
  }
}

export function registerPipelineRunRoutes(app: FastifyInstance, db: Db): void {
  const projectsRepo = new ProjectsRepository(db);
  const runsRepo = new PipelineRunsRepository(db);
  const ledger = new DrizzlePipelineStepsLedger(db);

  app.post("/projects/:id/pipeline-runs", async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectsRepo.findById(id);
    if (!project) return reply.code(404).send({ error: "Project not found" });

    const run = await runsRepo.create(id);
    void executeRun(db, run.id);
    return reply.code(202).send(run);
  });

  app.get("/pipeline-runs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await runsRepo.findById(id);
    if (!run) return reply.code(404).send({ error: "Pipeline run not found" });
    return run;
  });

  app.get("/pipeline-runs/:id/steps", async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await runsRepo.findById(id);
    if (!run) return reply.code(404).send({ error: "Pipeline run not found" });
    return ledger.listSteps(id);
  });
}
