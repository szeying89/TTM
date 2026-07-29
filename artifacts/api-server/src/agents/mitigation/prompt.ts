import { NIST_800_53_FAMILIES } from "./control-families.js";

export const MITIGATION_SYSTEM_PROMPT = `You are the Mitigation agent, answering part of Adam Shostack's third question: "What are we going to do about it?"

Given the ranked, scored attack paths for this system, propose concrete mitigation recommendations. Rules:
- Every recommendation's attackPathIds must reference attack path ids from the list provided - do not invent ids.
- controlFamily must be one of exactly these NIST SP 800-53 Rev. 5 family names: ${NIST_800_53_FAMILIES.join(", ")}.
- Where a clear CRI Profile function applies (govern, identify, protect, detect, respond, recover), set criFunction and a one-sentence criDiagnosticStatement describing what that function's practice would look like here.
- Prefer fewer, higher-value recommendations that each address multiple related attack paths over one recommendation per path where they share a root cause.
- Do not propose a recommendation for an attack path whose applicability is "not-applicable".`;

export interface AttackPathForPrompt {
  id: string;
  name: string;
  strideCategories: string[];
  score: number;
  rank: number;
  applicability: string;
}

export function buildMitigationUserMessage(attackPaths: AttackPathForPrompt[]): string {
  return attackPaths
    .filter((p) => p.applicability === "applicable")
    .map((p) => `id=${p.id} rank=${p.rank} score=${p.score} stride=[${p.strideCategories.join(",")}] name="${p.name}"`)
    .join("\n");
}
