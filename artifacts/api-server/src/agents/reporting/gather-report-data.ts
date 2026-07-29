import { eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { pipelineRuns } from "../../db/schema/pipeline.js";
import { projects } from "../../db/schema/projects.js";
import { loadLatestSystemModelForRun } from "../threat/read-system-model.js";
import { loadAttackPathsForSystemModel } from "../risk/read-attack-paths.js";
import { riskScores } from "../../db/schema/risk.js";
import { mitigationRecommendations } from "../../db/schema/mitigations.js";
import { assumptions, designDeltas } from "../../db/schema/design-enrich.js";
import { validationFindings, coverageCriticResults, pivotNodeFindings } from "../../db/schema/validation.js";

export async function gatherReportData(db: Db, runId: string) {
  const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).limit(1);
  if (!run) throw new Error(`Pipeline run "${runId}" not found`);

  const [project] = await db.select().from(projects).where(eq(projects.id, run.projectId)).limit(1);
  if (!project) throw new Error(`Project "${run.projectId}" not found`);

  const systemModel = await loadLatestSystemModelForRun(db, runId);
  const attackPaths = await loadAttackPathsForSystemModel(db, systemModel.systemModelId);
  const attackPathIds = attackPaths.map((p) => p.id);
  const risks =
    attackPathIds.length === 0 ? [] : await db.select().from(riskScores).where(inArray(riskScores.attackPathId, attackPathIds));

  const mitigations = await db
    .select()
    .from(mitigationRecommendations)
    .where(eq(mitigationRecommendations.systemModelId, systemModel.systemModelId));
  const assumptionRows = await db.select().from(assumptions).where(eq(assumptions.systemModelId, systemModel.systemModelId));
  const designDeltaRows = await db.select().from(designDeltas).where(eq(designDeltas.systemModelId, systemModel.systemModelId));
  const findings = await db
    .select()
    .from(validationFindings)
    .where(eq(validationFindings.systemModelId, systemModel.systemModelId));
  const [coverage] = await db
    .select()
    .from(coverageCriticResults)
    .where(eq(coverageCriticResults.systemModelId, systemModel.systemModelId))
    .limit(1);
  const pivotNodes = await db
    .select()
    .from(pivotNodeFindings)
    .where(eq(pivotNodeFindings.systemModelId, systemModel.systemModelId));

  return {
    run,
    project,
    systemModel,
    attackPaths,
    riskScores: risks,
    mitigations,
    assumptions: assumptionRows,
    designDeltas: designDeltaRows,
    validationFindings: findings,
    coverage,
    pivotNodes,
  };
}

export type ReportData = Awaited<ReturnType<typeof gatherReportData>>;
