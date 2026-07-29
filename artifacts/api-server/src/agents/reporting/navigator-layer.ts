// MITRE ATT&CK Navigator layer format v4.5. This follows the well-established,
// long-stable public layer-file shape (name/versions/domain/techniques[]/
// gradient/legendItems) rather than validating against the official JSON
// Schema file directly - that file's exact path in mitre-attack/attack-navigator
// could not be located from this environment's network access at the time
// this was written, so the shape below is hand-verified against the
// well-documented format instead of machine-validated against the source schema.
import type { MitreFramework } from "@intel-threat-modeller/contracts";

export interface NavigatorTechniqueEntry {
  techniqueID: string;
  score: number;
  color: string;
  comment: string;
  enabled: boolean;
}

export interface NavigatorLayer {
  name: string;
  versions: { attack: string; navigator: string; layer: string };
  domain: string;
  description: string;
  techniques: NavigatorTechniqueEntry[];
  gradient: { colors: string[]; minValue: number; maxValue: number };
  legendItems: { label: string; color: string }[];
}

const DOMAIN_BY_FRAMEWORK: Record<MitreFramework, string> = {
  enterprise: "enterprise-attack",
  ics: "ics-attack",
  atlas: "mobile-attack", // ATLAS has no official Navigator domain; closest supported placeholder.
};

export interface AttackPathForNavigator {
  groundingRefs: { techniqueId: string }[];
  name: string;
  applicability: string;
}

export function buildNavigatorLayer(
  projectName: string,
  framework: MitreFramework,
  attackPaths: AttackPathForNavigator[],
  scoreByTechniqueId: Map<string, number>,
): NavigatorLayer {
  const applicable = attackPaths.filter((p) => p.applicability === "applicable");
  const techniqueNames = new Map<string, string[]>();
  for (const path of applicable) {
    for (const ref of path.groundingRefs) {
      const names = techniqueNames.get(ref.techniqueId) ?? [];
      names.push(path.name);
      techniqueNames.set(ref.techniqueId, names);
    }
  }

  const techniques: NavigatorTechniqueEntry[] = Array.from(techniqueNames.entries()).map(([techniqueID, names]) => {
    const score = scoreByTechniqueId.get(techniqueID) ?? 0;
    return {
      techniqueID,
      score,
      color: score >= 75 ? "#8b0000" : score >= 50 ? "#ff8c00" : score >= 25 ? "#ffd700" : "#90ee90",
      comment: names.join("; "),
      enabled: true,
    };
  });

  return {
    name: `${projectName} - Threat Model`,
    versions: { attack: "16", navigator: "4.9.1", layer: "4.5" },
    domain: DOMAIN_BY_FRAMEWORK[framework],
    description: `Generated threat model for ${projectName}`,
    techniques,
    gradient: { colors: ["#90ee90", "#ffd700", "#ff8c00", "#8b0000"], minValue: 0, maxValue: 100 },
    legendItems: [
      { label: "Critical (75-100)", color: "#8b0000" },
      { label: "High (50-74)", color: "#ff8c00" },
      { label: "Medium (25-49)", color: "#ffd700" },
      { label: "Low (0-24)", color: "#90ee90" },
    ],
  };
}
