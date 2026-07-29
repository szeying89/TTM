import type { ReportData } from "./gather-report-data.js";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const HEADER = ["Rank", "Attack Path", "STRIDE", "Score", "Likelihood", "Impact", "Heatmap Cell", "Applicability", "Mitigations"];

export function buildRiskRegisterCsv(data: ReportData): string {
  const riskByAttackPathId = new Map(data.riskScores.map((r) => [r.attackPathId, r]));
  const mitigationTitlesByAttackPathId = new Map<string, string[]>();
  for (const mitigation of data.mitigations) {
    for (const attackPathId of mitigation.attackPathIds) {
      const list = mitigationTitlesByAttackPathId.get(attackPathId) ?? [];
      list.push(mitigation.title);
      mitigationTitlesByAttackPathId.set(attackPathId, list);
    }
  }

  const rows = [...data.attackPaths]
    .sort((a, b) => (riskByAttackPathId.get(a.id)?.rank ?? 999) - (riskByAttackPathId.get(b.id)?.rank ?? 999))
    .map((path) => {
      const risk = riskByAttackPathId.get(path.id);
      const mitigationTitles = mitigationTitlesByAttackPathId.get(path.id) ?? [];
      return [
        String(risk?.rank ?? ""),
        path.name,
        path.strideCategories.join("; "),
        String(risk?.score ?? ""),
        risk ? risk.likelihood.toFixed(2) : "",
        risk ? risk.impact.toFixed(2) : "",
        risk?.heatmapCell ?? "",
        path.applicability,
        mitigationTitles.join("; "),
      ].map(csvEscape);
    });

  return [HEADER, ...rows].map((row) => row.join(",")).join("\n");
}
