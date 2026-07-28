import type { LoadedSystemModel } from "../threat/read-system-model.js";

type AttackPathRow = {
  entities: { componentId: string; role: string }[];
  groundingRefs: { techniqueId: string }[];
  killChainStages: string[];
};

// Relative likelihood weight of an attack reaching this tactic stage at all -
// early-kill-chain tactics (initial access, execution, discovery) are far
// more commonly attempted in the wild than late-stage ones (exfiltration,
// impact) which require a longer successful chain first. Deliberately coarse
// and versioned here rather than sourced from an external base-rate dataset.
const TACTIC_BASE_RATE: Record<string, number> = {
  Reconnaissance: 0.9,
  "Resource Development": 0.8,
  "Initial Access": 0.9,
  Execution: 0.85,
  Persistence: 0.6,
  "Privilege Escalation": 0.55,
  "Defense Evasion": 0.6,
  "Credential Access": 0.65,
  Discovery: 0.75,
  "Lateral Movement": 0.5,
  Collection: 0.45,
  "Command and Control": 0.45,
  Exfiltration: 0.35,
  Impact: 0.3,
};
const DEFAULT_BASE_RATE = 0.5;

const SENSITIVE_DATA_RE = /pii|payment|card|credential|secret|health|ssn|password/i;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export interface RiskFactors {
  likelihood: number;
  impact: number;
  baseScore: number;
  heatmapCell: string;
}

function bucket(value: number): "low" | "medium" | "high" {
  if (value < 0.34) return "low";
  if (value < 0.67) return "medium";
  return "high";
}

export function computeRiskFactors(attackPath: AttackPathRow, systemModel: LoadedSystemModel): RiskFactors {
  const componentById = new Map(systemModel.components.map((c) => [c.id, c]));
  const entityComponents = attackPath.entities.map((e) => componentById.get(e.componentId)).filter((c) => !!c);

  const hasExternalEntity = entityComponents.some((c) => c.type === "actor" || c.type === "external_entity");
  const hasUnprotectedComponent = entityComponents.some((c) => !c.trustBoundaryId);
  const primaryTactic = attackPath.killChainStages[0];
  const baseRate = primaryTactic ? (TACTIC_BASE_RATE[primaryTactic] ?? DEFAULT_BASE_RATE) : DEFAULT_BASE_RATE;
  const corroboration = attackPath.groundingRefs.length > 1 ? 1 : 0.5;

  const likelihood = clamp01(
    0.35 * (hasExternalEntity ? 1 : 0) +
      0.25 * (hasUnprotectedComponent ? 1 : 0) +
      0.2 * baseRate +
      0.2 * corroboration,
  );

  const relatedDataflows = systemModel.dataflows.filter(
    (df) =>
      attackPath.entities.some((e) => e.componentId === df.sourceComponentId) ||
      attackPath.entities.some((e) => e.componentId === df.targetComponentId),
  );
  const hasSensitiveData = relatedDataflows.some((df) => df.dataClassification && SENSITIVE_DATA_RE.test(df.dataClassification));
  const dataClassificationWeight = hasSensitiveData ? 1 : entityComponents.some((c) => c.type === "datastore") ? 0.7 : 0.4;
  const touchesDatastore = entityComponents.some((c) => c.type === "datastore");
  const boundaryCriticality = entityComponents.some((c) => !!c.trustBoundaryId) ? 0.7 : 0.4;

  const impact = clamp01(
    0.4 * dataClassificationWeight + 0.35 * (touchesDatastore ? 1 : 0.5) + 0.25 * boundaryCriticality,
  );

  const baseScore = Math.round(100 * likelihood * impact);
  const heatmapCell = `${bucket(likelihood)}-${bucket(impact)}`;

  return { likelihood, impact, baseScore, heatmapCell };
}
