export const RISK_RATIONALE_SYSTEM_PROMPT = `You are the Risk agent's coherence-review pass, answering part of Adam Shostack's third question: "What are we going to do about it?" (scoring, ahead of mitigation).

You are given, for each attack path, its deterministically computed likelihood, impact, base score, CRI Profile adjustment, and any intel-feed adjustment. Write a concise (1-3 sentence) rationale for EACH attack path's final score that a CISO could read and understand why the number is what it is. You do not change any scores - only explain them. Reference the specific factors that drove the score (e.g. internet exposure, sensitive data, low control maturity, active exploitation intel) rather than generic language.`;

export interface RiskFactorSummary {
  attackPathId: string;
  name: string;
  likelihood: number;
  impact: number;
  baseScore: number;
  criFunction: string;
  criMaturityTier: string;
  criModifier: number;
  intelModifier?: number;
  intelSummary?: string;
  finalScore: number;
}

export function buildRiskRationaleUserMessage(summaries: RiskFactorSummary[]): string {
  return summaries
    .map(
      (s) =>
        `attackPathId=${s.attackPathId}\nname="${s.name}"\nlikelihood=${s.likelihood.toFixed(2)} impact=${s.impact.toFixed(2)} baseScore=${s.baseScore}\nCRI: function=${s.criFunction} maturity=${s.criMaturityTier} modifier=${s.criModifier.toFixed(2)}${
          s.intelModifier !== undefined ? `\nIntel: modifier=${s.intelModifier.toFixed(2)} (${s.intelSummary})` : ""
        }\nfinalScore=${s.finalScore}`,
    )
    .join("\n\n");
}
