import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { pipelineRuns } from "../db/schema/pipeline.js";
import { reports } from "../db/schema/reports.js";

export class ReportsRepository {
  constructor(private readonly db: Db) {}

  async listByProject(projectId: string) {
    return this.db
      .select({
        id: reports.id,
        runId: reports.runId,
        audience: reports.audience,
        confidence: reports.confidence,
        confidenceSubScores: reports.confidenceSubScores,
        markdown: reports.markdown,
        generatedAt: reports.generatedAt,
      })
      .from(reports)
      .innerJoin(pipelineRuns, eq(reports.runId, pipelineRuns.id))
      .where(eq(pipelineRuns.projectId, projectId));
  }
}
