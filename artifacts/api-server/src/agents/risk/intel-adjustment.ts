import type { IntelAdjustment } from "@intel-threat-modeller/contracts";

type AttackPathRow = {
  entities: { componentId: string; role: string }[];
  groundingRefs: { techniqueId: string }[];
};

type IntelSignalRow = {
  id: string;
  signalType: string;
  relatedTechniqueIds: { techniqueId: string; framework: string }[];
  relatedComponentIds: string[];
  severity: number;
};

const MAX_MODIFIER_PER_SIGNAL_TYPE: Record<string, number> = {
  "active-exploitation": 0.2,
  "threat-actor-targeting": 0.15,
  "cve-severity": 0.15,
  "sector-relevance": 0.08,
  other: 0.05,
};
const TOTAL_MODIFIER_CAP = 0.2;

export function computeIntelAdjustment(
  attackPath: AttackPathRow,
  intelSignals: IntelSignalRow[],
): IntelAdjustment | undefined {
  const techniqueIds = new Set(attackPath.groundingRefs.map((r) => r.techniqueId));
  const componentIds = new Set(attackPath.entities.map((e) => e.componentId));

  const matches = intelSignals.filter(
    (signal) =>
      signal.relatedTechniqueIds.some((t) => techniqueIds.has(t.techniqueId)) ||
      signal.relatedComponentIds.some((id) => componentIds.has(id)),
  );
  if (matches.length === 0) return undefined;

  let modifier = 0;
  const reasons: string[] = [];
  for (const signal of matches) {
    const cap = MAX_MODIFIER_PER_SIGNAL_TYPE[signal.signalType] ?? MAX_MODIFIER_PER_SIGNAL_TYPE.other!;
    modifier += cap * signal.severity;
    reasons.push(`${signal.signalType} (severity ${signal.severity.toFixed(2)})`);
  }
  modifier = Math.min(modifier, TOTAL_MODIFIER_CAP);

  return {
    intelSignalIds: matches.map((s) => s.id),
    modifier,
    rationale: `${matches.length} ingested intel signal(s) matched this attack path's technique(s) or entities: ${reasons.join(", ")}.`,
  };
}
