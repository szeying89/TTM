const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  criMaturity: Record<string, string>;
  createdAt: string;
}

export interface DesignDoc {
  id: string;
  projectId: string;
  prose: string;
  mermaidText: string;
  createdAt: string;
}

export interface PipelineRun {
  id: string;
  projectId: string;
  framework: string;
  status: "pending" | "running" | "succeeded" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface PipelineStep {
  id: string;
  runId: string;
  agentName: string;
  wave: number;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  error: string | null;
}

export interface Report {
  id: string;
  runId: string;
  audience: "executive" | "ciso" | "technical";
  confidence: number;
  markdown: string;
  generatedAt: string;
}

/** Thin wrapper over the api-server REST API - no orchestrator/agent logic lives here. */
export const apiClient = {
  listProjects: () => request<Project[]>("/projects"),

  createProject: (input: { name: string; description?: string }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(input) }),

  uploadDesignDoc: (projectId: string, input: { prose: string; mermaidText?: string }) =>
    request<DesignDoc>(`/projects/${projectId}/design-doc`, {
      method: "POST",
      body: JSON.stringify({ prose: input.prose, mermaidText: input.mermaidText ?? "" }),
    }),

  runThreatModelPipeline: (projectId: string, framework?: string) =>
    request<PipelineRun>(`/projects/${projectId}/pipeline-runs`, {
      method: "POST",
      body: JSON.stringify(framework ? { framework } : {}),
    }),

  getPipelineRun: (runId: string) => request<PipelineRun>(`/pipeline-runs/${runId}`),
  getPipelineSteps: (runId: string) => request<PipelineStep[]>(`/pipeline-runs/${runId}/steps`),

  getReports: (projectId: string) => request<Report[]>(`/projects/${projectId}/reports`),
};
