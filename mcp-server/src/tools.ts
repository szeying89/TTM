import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MitreFramework, ReportAudience } from "@intel-threat-modeller/contracts";
import { apiClient, ApiError } from "./api-client.js";

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err: unknown) {
  const message = err instanceof ApiError ? `${err.status}: ${err.message}` : err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List all Intel-Threat-Modeller projects.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await apiClient.listProjects());
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a new threat-modelling project.",
      inputSchema: {
        name: z.string().min(1).describe("Project name."),
        description: z.string().optional().describe("Optional project description."),
      },
    },
    async ({ name, description }) => {
      try {
        return jsonResult(await apiClient.createProject({ name, description }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "upload_design_doc",
    {
      title: "Upload design document",
      description:
        "Attach a system design document to a project: free-text prose describing the system, plus an optional Mermaid flowchart diagram of its components and data flows.",
      inputSchema: {
        projectId: z.string().describe("The project's id, from create_project or list_projects."),
        prose: z.string().min(1).describe("Free-text description of the system's components, data flows, and trust boundaries."),
        mermaidText: z.string().optional().describe("Optional Mermaid flowchart source describing the system's components and data flows."),
      },
    },
    async ({ projectId, prose, mermaidText }) => {
      try {
        return jsonResult(await apiClient.uploadDesignDoc(projectId, { prose, mermaidText }));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "run_threat_model_pipeline",
    {
      title: "Run threat model pipeline",
      description:
        "Trigger the 7-agent threat-modelling pipeline (Architect, Threat, Risk, Mitigation, Design-Enrich, Validation, Reporting) for a project's most recent design document. Returns immediately with a pipeline run id - use get_pipeline_status to poll for completion.",
      inputSchema: {
        projectId: z.string().describe("The project's id."),
        framework: MitreFramework.optional().describe("Which MITRE framework to ground threats in. Defaults to \"enterprise\"."),
      },
    },
    async ({ projectId, framework }) => {
      try {
        return jsonResult(await apiClient.runThreatModelPipeline(projectId, framework));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_pipeline_status",
    {
      title: "Get pipeline run status",
      description: "Get a pipeline run's overall status plus the status of each of its 7 agent steps.",
      inputSchema: {
        runId: z.string().describe("The pipeline run's id, from run_threat_model_pipeline."),
      },
    },
    async ({ runId }) => {
      try {
        const [run, steps] = await Promise.all([apiClient.getPipelineRun(runId), apiClient.getPipelineSteps(runId)]);
        return jsonResult({ run, steps });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_report",
    {
      title: "Get threat model report",
      description:
        "Get generated threat model report(s) for a project, optionally filtered to a specific pipeline run and/or audience (executive, ciso, or technical).",
      inputSchema: {
        projectId: z.string().describe("The project's id."),
        runId: z.string().optional().describe("Optional pipeline run id to filter to a single run's reports."),
        audience: ReportAudience.optional().describe("Optional audience to filter to a single report (executive, ciso, or technical)."),
      },
    },
    async ({ projectId, runId, audience }) => {
      try {
        const reports = await apiClient.getReports(projectId);
        const filtered = reports.filter((r) => (runId ? r.runId === runId : true) && (audience ? r.audience === audience : true));
        return jsonResult(filtered);
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
