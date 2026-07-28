import { API_BASE_URL } from "./config";
import type {
  AttackPathWithRisk,
  CriFunction,
  CriMaturityTier,
  DesignDoc,
  IntelFeedItem,
  IntelSignal,
  MitigationRecommendation,
  MitreFramework,
  PipelineRun,
  PipelineStep,
  Project,
  Report,
  ReportArtifacts,
  SystemModelResponse,
} from "./types";

class ApiError extends Error {
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
    headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<Project[]>("/projects"),
  createProject: (input: { name: string; description?: string; criMaturity?: Partial<Record<CriFunction, CriMaturityTier>> }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(input) }),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  updateProject: (id: string, input: { name?: string; description?: string; criMaturity?: Partial<Record<CriFunction, CriMaturityTier>> }) =>
    request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  addDesignDoc: (projectId: string, input: { prose: string; mermaidText: string }) =>
    request<DesignDoc>(`/projects/${projectId}/design-doc`, { method: "POST", body: JSON.stringify(input) }),

  createPipelineRun: (projectId: string, framework: MitreFramework) =>
    request<PipelineRun>(`/projects/${projectId}/pipeline-runs`, { method: "POST", body: JSON.stringify({ framework }) }),
  listPipelineRuns: (projectId: string) => request<PipelineRun[]>(`/projects/${projectId}/pipeline-runs`),
  getPipelineRun: (runId: string) => request<PipelineRun>(`/pipeline-runs/${runId}`),
  getPipelineSteps: (runId: string) => request<PipelineStep[]>(`/pipeline-runs/${runId}/steps`),

  submitIntelFeedUrl: (projectId: string, url: string) =>
    request<IntelFeedItem>(`/projects/${projectId}/intel-feeds`, { method: "POST", body: JSON.stringify({ url }) }),
  submitIntelFeedPdf: async (projectId: string, file: File): Promise<IntelFeedItem> => {
    const formData = new FormData();
    formData.append("file", file);
    return request<IntelFeedItem>(`/projects/${projectId}/intel-feeds`, { method: "POST", body: formData });
  },
  listIntelFeeds: (projectId: string) => request<IntelFeedItem[]>(`/projects/${projectId}/intel-feeds`),
  listIntelSignals: (feedId: string) => request<IntelSignal[]>(`/intel-feeds/${feedId}/signals`),

  getSystemModel: (runId: string) => request<SystemModelResponse>(`/pipeline-runs/${runId}/system-model`),
  getAttackPaths: (runId: string) => request<AttackPathWithRisk[]>(`/pipeline-runs/${runId}/attack-paths`),
  getMitigations: (runId: string) => request<MitigationRecommendation[]>(`/pipeline-runs/${runId}/mitigations`),
  getReports: (projectId: string) => request<Report[]>(`/projects/${projectId}/reports`),
  getReportArtifacts: (runId: string) => request<ReportArtifacts>(`/pipeline-runs/${runId}/report-artifacts`),
  reportPdfUrl: (runId: string) => `${API_BASE_URL}/pipeline-runs/${runId}/report.pdf`,
};

export { ApiError };
