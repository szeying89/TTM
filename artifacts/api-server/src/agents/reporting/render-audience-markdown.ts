import type { ReportData } from "./gather-report-data.js";
import type { AudienceSummary } from "./audience-schema.js";

export function renderAudienceMarkdown(
  data: ReportData,
  confidence: number,
  audienceTitle: string,
  llmSummary: AudienceSummary,
): string {
  const riskByAttackPathId = new Map(data.riskScores.map((r) => [r.attackPathId, r]));
  const topRisks = [...data.attackPaths]
    .filter((p) => p.applicability === "applicable")
    .sort((a, b) => (riskByAttackPathId.get(a.id)?.rank ?? 999) - (riskByAttackPathId.get(b.id)?.rank ?? 999))
    .slice(0, 10);

  const lines = [
    `# ${data.project.name} - ${audienceTitle} Report`,
    "",
    `**Confidence score:** ${confidence}/100`,
    "",
    "## Summary",
    "",
    llmSummary.summary,
    "",
    "## Key recommendations",
    "",
    ...llmSummary.keyRecommendations.map((r) => `- ${r}`),
    "",
    "## Top-ranked risks",
    "",
    "| Rank | Attack Path | Score |",
    "|---|---|---|",
    ...topRisks.map((p) => `| ${riskByAttackPathId.get(p.id)?.rank ?? "-"} | ${p.name} | ${riskByAttackPathId.get(p.id)?.score ?? "-"} |`),
  ];

  return lines.join("\n");
}
