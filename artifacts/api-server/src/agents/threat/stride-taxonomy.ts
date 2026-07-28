import type { MitreFramework, StrideCategory } from "@intel-threat-modeller/contracts";

export const STRIDE_CATEGORY_DESCRIPTIONS: Record<StrideCategory, string> = {
  spoofing: "An attacker impersonates a user, component, or system to gain unauthorized trust.",
  tampering: "An attacker maliciously modifies data, code, or configuration in transit or at rest.",
  repudiation:
    "An attacker performs an action without it being attributable, or denies having performed it, due to insufficient logging/auditing.",
  "information-disclosure": "An attacker gains access to information they are not authorized to see.",
  "denial-of-service":
    "An attacker degrades or denies availability of a service or resource to legitimate users.",
  "elevation-of-privilege": "An attacker gains capabilities or permissions beyond what they were granted.",
};

export const ALL_STRIDE_CATEGORIES = Object.keys(STRIDE_CATEGORY_DESCRIPTIONS) as StrideCategory[];

// Canonical kill-chain stage ordering, per framework, taken directly from
// each framework's own tactic matrix rather than invented - Enterprise and
// ICS are MITRE's long-stable published tactic orderings; the ATLAS order
// below was read directly from mitre-atlas/atlas-data's ATLAS.yaml tactics
// list (matrix order), not assumed.
export const KILL_CHAIN_STAGE_ORDER: Record<MitreFramework, string[]> = {
  enterprise: [
    "Reconnaissance",
    "Resource Development",
    "Initial Access",
    "Execution",
    "Persistence",
    "Privilege Escalation",
    "Defense Evasion",
    "Credential Access",
    "Discovery",
    "Lateral Movement",
    "Collection",
    "Command and Control",
    "Exfiltration",
    "Impact",
  ],
  ics: [
    "Initial Access",
    "Execution",
    "Persistence",
    "Privilege Escalation",
    "Evasion",
    "Discovery",
    "Lateral Movement",
    "Collection",
    "Command and Control",
    "Inhibit Response Function",
    "Impair Process Control",
    "Impact",
  ],
  atlas: [
    "Reconnaissance",
    "Resource Development",
    "Initial Access",
    "AI Model Access",
    "Execution",
    "Persistence",
    "Privilege Escalation",
    "Defense Evasion",
    "Credential Access",
    "Discovery",
    "Lateral Movement",
    "Collection",
    "AI Attack Staging",
    "Command and Control",
    "Exfiltration",
    "Impact",
  ],
};

export function sortKillChainStages(framework: MitreFramework, stages: string[]): string[] {
  const order = KILL_CHAIN_STAGE_ORDER[framework];
  return [...stages].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
