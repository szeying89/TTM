import { desc, eq } from "drizzle-orm";
import type { MitreFramework } from "@intel-threat-modeller/contracts";
import type { Db } from "../db/client.js";
import { pipelineRuns } from "../db/schema/pipeline.js";

export class PipelineRunsRepository {
  constructor(private readonly db: Db) {}

  async create(projectId: string, framework: MitreFramework = "enterprise") {
    const [run] = await this.db
      .insert(pipelineRuns)
      .values({ projectId, framework, status: "pending" })
      .returning();
    if (!run) throw new Error("Failed to insert pipeline_runs row");
    return run;
  }

  async markRunning(id: string) {
    await this.db
      .update(pipelineRuns)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(pipelineRuns.id, id));
  }

  async markFinished(id: string, status: "succeeded" | "failed") {
    await this.db.update(pipelineRuns).set({ status, finishedAt: new Date() }).where(eq(pipelineRuns.id, id));
  }

  async findById(id: string) {
    const [run] = await this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, id)).limit(1);
    return run;
  }

  async listByProject(projectId: string) {
    return this.db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.projectId, projectId))
      .orderBy(desc(pipelineRuns.createdAt));
  }
}
