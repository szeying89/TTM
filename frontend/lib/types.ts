export type MitreFramework = "enterprise" | "ics" | "atlas";
export type CriFunction = "govern" | "identify" | "protect" | "detect" | "respond" | "recover";
export type CriMaturityTier = "not-assessed" | "baseline" | "evolving" | "intermediate" | "advanced" | "innovative";

export interface Project {
  id: string;
  name: string;
  description: string;
  criMaturity: Partial<Record<CriFunction, CriMaturityTier>>;
  createdAt: string;
}

export interface DesignDoc {
  id: string;
  projectId: string;
  prose: string;
  mermaidText: string;
  createdAt: string;
}

export type PipelineRunStatus = "pending" | "running" | "succeeded" | "failed";

export interface PipelineRun {
  id: string;
  projectId: string;
  framework: MitreFramework;
  status: PipelineRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export type PipelineStepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export interface PipelineStep {
  id: string;
  runId: string;
  agentName: string;
  wave: number;
  dependsOn: string[];
  status: PipelineStepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  inputRefs: string[];
  outputRefs: string[];
  error: string | null;
  retryCount: number;
}

export type IntelFeedSourceType = "url" | "pdf";
export type IntelFeedStatus = "pending" | "processed" | "failed";

export interface IntelFeedItem {
  id: string;
  projectId: string;
  sourceType: IntelFeedSourceType;
  sourceRef: string;
  fetchedAt: string;
  rawTextRef: string | null;
  status: IntelFeedStatus;
  failureReason: string | null;
}

export type IntelSignalType = "active-exploitation" | "threat-actor-targeting" | "cve-severity" | "sector-relevance" | "other";

export interface IntelSignal {
  id: string;
  intelFeedItemId: string;
  signalType: IntelSignalType;
  relatedTechniqueIds: { techniqueId: string; framework: MitreFramework }[];
  relatedComponentIds: string[];
  severity: number;
  summary: string;
  confidence: number;
  extractedAt: string;
}

export type ComponentType = "process" | "datastore" | "external_entity" | "actor";

export interface SystemComponent {
  id: string;
  systemModelId: string;
  name: string;
  type: ComponentType;
  description: string;
  technologies: string[];
  trustBoundaryId: string | null;
  sourceRefs: string[];
}

export interface Dataflow {
  id: string;
  systemModelId: string;
  name: string;
  sourceComponentId: string;
  targetComponentId: string;
  protocol: string | null;
  dataClassification: string | null;
  crossesTrustBoundaryIds: string[];
}

export interface TrustBoundary {
  id: string;
  systemModelId: string;
  name: string;
  componentIds: string[];
}

export interface SystemModelResponse {
  components: SystemComponent[];
  dataflows: Dataflow[];
  trustBoundaries: TrustBoundary[];
}

export type StrideCategory =
  | "spoofing"
  | "tampering"
  | "repudiation"
  | "information-disclosure"
  | "denial-of-service"
  | "elevation-of-privilege";

export interface GroundingRef {
  techniqueId: string;
  framework: MitreFramework;
  chunkId: string;
  retrievalScore: number;
}

export interface CriAdjustment {
  function: CriFunction;
  maturityTier: CriMaturityTier;
  modifier: number;
  rationale: string;
}

export interface IntelAdjustment {
  intelSignalIds: string[];
  modifier: number;
  rationale: string;
}

export interface RiskScore {
  id: string;
  attackPathId: string;
  likelihood: number;
  impact: number;
  baseScore: number;
  criAdjustment: CriAdjustment;
  intelAdjustment: IntelAdjustment | null;
  score: number;
  rank: number;
  heatmapCell: string;
  rationale: string;
}

export interface AttackPathWithRisk {
  id: string;
  systemModelId: string;
  name: string;
  sourcePass: "rule-pack" | "stride-llm" | "other-threats";
  strideCategories: StrideCategory[];
  entities: { componentId: string; role: string }[];
  killChainStages: string[];
  groupKey: string;
  groundingRefs: GroundingRef[];
  applicability: "applicable" | "not-applicable";
  notApplicableRationaleCategory: string | null;
  notApplicableRationale: string | null;
  risk: RiskScore | null;
}

export interface MitigationRecommendation {
  id: string;
  systemModelId: string;
  attackPathIds: string[];
  controlFamily: string;
  criFunction: CriFunction | null;
  criDiagnosticStatement: string | null;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "proposed" | "accepted" | "rejected" | "implemented";
}

export type ReportAudience = "executive" | "ciso" | "technical";

export interface ConfidenceSubScores {
  validationPassRate: number;
  coverageScore: number;
  groundingScore: number;
  pivotNodeResolutionScore: number;
}

export interface Report {
  id: string;
  runId: string;
  audience: ReportAudience;
  confidence: number;
  confidenceSubScores: ConfidenceSubScores;
  markdown: string;
  generatedAt: string;
}

export interface ReportArtifacts {
  id: string;
  runId: string;
  threatModelMarkdown: string;
  jsonDump: unknown;
  navigatorLayer: unknown;
  riskRegisterCsv: string;
  confidence: number;
  generatedAt: string;
  hasPdf: boolean;
}
