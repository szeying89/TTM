import type { ReportData } from "./gather-report-data.js";
import type { ConfidenceSubScores } from "./scoring-config.js";

const SYSTEM_PROMPT_BY_AUDIENCE = {
  executive: `You are writing the Executive summary of a threat model for a non-technical business audience. Write a short (3-5 sentence) plain-language summary of the overall risk posture and business impact, and 2-4 top-line recommendations in business terms (cost/risk framing, not technical jargon). Never invent facts, numbers, or findings beyond what's given to you - only interpret and prioritize them in business language.`,
  ciso: `You are writing the CISO summary of a threat model - a risk-prioritized view for a security leader who needs to decide what to fund and staff. Write a concise (4-6 sentence) summary emphasizing the highest-risk findings, control gaps, and organizational maturity implications, and 3-5 prioritized recommendations referencing specific control families. Never invent facts, numbers, or findings beyond what's given to you.`,
} as const;

export type LlmAudience = keyof typeof SYSTEM_PROMPT_BY_AUDIENCE;

export function getAudienceSystemPrompt(audience: LlmAudience): string {
  return SYSTEM_PROMPT_BY_AUDIENCE[audience];
}

export function buildAudienceUserMessage(data: ReportData, confidence: number, subScores: ConfidenceSubScores): string {
  const riskByAttackPathId = new Map(data.riskScores.map((r) => [r.attackPathId, r]));
  const topRisks = [...data.attackPaths]
    .filter((p) => p.applicability === "applicable")
    .sort((a, b) => (riskByAttackPathId.get(a.id)?.rank ?? 999) - (riskByAttackPathId.get(b.id)?.rank ?? 999))
    .slice(0, 10)
    .map((p) => {
      const risk = riskByAttackPathId.get(p.id);
      return `rank=${risk?.rank} score=${risk?.score} name="${p.name}" stride=[${p.strideCategories.join(",")}]`;
    })
    .join("\n");

  const mitigationSummary = data.mitigations
    .map((m) => `[${m.priority}] ${m.title} (${m.controlFamily})`)
    .join("\n");

  return [
    `Project: ${data.project.name}`,
    `Confidence score: ${confidence}/100 (validation ${(subScores.validationPassRate * 100).toFixed(0)}%, coverage ${(subScores.coverageScore * 100).toFixed(0)}%, grounding ${(subScores.groundingScore * 100).toFixed(0)}%, pivot-node resolution ${(subScores.pivotNodeResolutionScore * 100).toFixed(0)}%)`,
    `Total attack paths: ${data.attackPaths.length} (${data.attackPaths.filter((p) => p.applicability === "applicable").length} applicable)`,
    `Pivot nodes: ${data.pivotNodes.length}`,
    `\n# Top-ranked risks\n${topRisks}`,
    `\n# Mitigation recommendations\n${mitigationSummary}`,
  ].join("\n");
}
