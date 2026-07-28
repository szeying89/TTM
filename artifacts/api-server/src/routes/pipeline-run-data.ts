import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/client.js";
import { pipelineRuns } from "../db/schema/pipeline.js";
import { systemModels, components, dataflows, trustBoundaries } from "../db/schema/system-model.js";
import { attackPaths } from "../db/schema/threats.js";
import { riskScores } from "../db/schema/risk.js";
import { mitigationRecommendations } from "../db/schema/mitigations.js";
import { reportArtifacts } from "../db/schema/report-artifacts.js";

async function findLatestSystemModelId(db: Db, runId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ id: systemModels.id })
    .from(systemModels)
    .where(eq(systemModels.runId, runId))
    .limit(1);
  return row?.id;
}

export function registerPipelineRunDataRoutes(app: FastifyInstance, db: Db): void {
  app.get("/pipeline-runs/:id/system-model", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, id)).limit(1);
    if (!run) return reply.code(404).send({ error: "Pipeline run not found" });

    const systemModelId = await findLatestSystemModelId(db, id);
    if (!systemModelId) return { components: [], dataflows: [], trustBoundaries: [] };

    const [componentRows, dataflowRows, trustBoundaryRows] = await Promise.all([
      db.select().from(components).where(eq(components.systemModelId, systemModelId)),
      db.select().from(dataflows).where(eq(dataflows.systemModelId, systemModelId)),
      db.select().from(trustBoundaries).where(eq(trustBoundaries.systemModelId, systemModelId)),
    ]);
    return { components: componentRows, dataflows: dataflowRows, trustBoundaries: trustBoundaryRows };
  });

  app.get("/pipeline-runs/:id/attack-paths", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, id)).limit(1);
    if (!run) return reply.code(404).send({ error: "Pipeline run not found" });

    const systemModelId = await findLatestSystemModelId(db, id);
    if (!systemModelId) return [];

    const pathRows = await db.select().from(attackPaths).where(eq(attackPaths.systemModelId, systemModelId));
    const pathIds = pathRows.map((p) => p.id);
    const riskRows = pathIds.length === 0 ? [] : await db.select().from(riskScores).where(inArray(riskScores.attackPathId, pathIds));
    const riskByPathId = new Map(riskRows.map((r) => [r.attackPathId, r]));

    return pathRows
      .map((p) => ({ ...p, risk: riskByPathId.get(p.id) ?? null }))
      .sort((a, b) => (a.risk?.rank ?? 999) - (b.risk?.rank ?? 999));
  });

  app.get("/pipeline-runs/:id/mitigations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, id)).limit(1);
    if (!run) return reply.code(404).send({ error: "Pipeline run not found" });

    const systemModelId = await findLatestSystemModelId(db, id);
    if (!systemModelId) return [];
    return db.select().from(mitigationRecommendations).where(eq(mitigationRecommendations.systemModelId, systemModelId));
  });

  app.get("/pipeline-runs/:id/report-artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [artifact] = await db.select().from(reportArtifacts).where(eq(reportArtifacts.runId, id)).limit(1);
    if (!artifact) return reply.code(404).send({ error: "No report artifacts for this run yet" });
    const { pdfPath, ...rest } = artifact;
    return { ...rest, hasPdf: !!pdfPath };
  });

  app.get("/pipeline-runs/:id/report.pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [artifact] = await db.select().from(reportArtifacts).where(eq(reportArtifacts.runId, id)).limit(1);
    if (!artifact?.pdfPath) return reply.code(404).send({ error: "No PDF available for this run" });

    try {
      await stat(artifact.pdfPath);
    } catch {
      return reply.code(404).send({ error: "PDF file is no longer available" });
    }

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="threat-model-${id}.pdf"`);
    return reply.send(createReadStream(artifact.pdfPath));
  });
}
