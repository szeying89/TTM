import { desc, eq } from "drizzle-orm";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { Db } from "../../db/client.js";
import type { AgentDescriptor } from "../../orchestrator/types.js";
import { pipelineRuns } from "../../db/schema/pipeline.js";
import { designDocs } from "../../db/schema/projects.js";
import { parseFlowchart } from "./mermaid-flowchart-parser.js";
import { ARCHITECT_SYSTEM_PROMPT, buildArchitectUserMessage } from "./prompt.js";
import { ArchitectOutput } from "./schema.js";
import { persistSystemModel } from "./persist.js";

export interface ArchitectAgentDeps {
  db: Db;
  llmClient: LLMClient;
  model?: string;
}

export function createArchitectAgentDescriptor(deps: ArchitectAgentDeps): AgentDescriptor {
  const model = deps.model ?? process.env.LLM_DEFAULT_MODEL ?? "claude-opus-5";

  return {
    name: "architect",
    dependsOn: [],
    outputs: ["SystemModel"],
    handler: async (ctx) => {
      const [run] = await deps.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, ctx.runId)).limit(1);
      if (!run) throw new Error(`Pipeline run "${ctx.runId}" not found`);

      const [doc] = await deps.db
        .select()
        .from(designDocs)
        .where(eq(designDocs.projectId, run.projectId))
        .orderBy(desc(designDocs.createdAt))
        .limit(1);
      if (!doc) throw new Error(`No design doc found for project "${run.projectId}"`);

      const flowchartAst = doc.mermaidText.trim() ? parseFlowchart(doc.mermaidText) : undefined;
      const userMessage = buildArchitectUserMessage(doc.prose, flowchartAst);

      const { data } = await deps.llmClient.completeStructured({
        model,
        system: ARCHITECT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
        schema: ArchitectOutput,
        schemaName: "ArchitectOutput",
        maxTokens: 8192,
      });

      const persisted = await persistSystemModel(deps.db, ctx.runId, data);

      return {
        outputRefs: [
          `system_model:${persisted.systemModelId}`,
          ...persisted.componentIds.map((id) => `component:${id}`),
          ...persisted.dataflowIds.map((id) => `dataflow:${id}`),
          ...persisted.trustBoundaryIds.map((id) => `trust_boundary:${id}`),
        ],
      };
    },
  };
}
