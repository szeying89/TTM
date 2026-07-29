import type { ValidationAttackPath, ValidationComponent, ValidationFindingCandidate } from "../types.js";

export function checkEntityAnchoring(
  attackPaths: ValidationAttackPath[],
  components: ValidationComponent[],
): ValidationFindingCandidate[] {
  const validComponentIds = new Set(components.map((c) => c.id));
  const findings: ValidationFindingCandidate[] = [];

  for (const path of attackPaths) {
    const danglingIds = path.entities.map((e) => e.componentId).filter((id) => !validComponentIds.has(id));
    findings.push({
      ruleId: "entity-anchoring",
      category: "entity-anchoring",
      targetId: path.id,
      passed: danglingIds.length === 0,
      message:
        danglingIds.length === 0
          ? "All entities resolve to real components."
          : `Entities reference unknown component id(s): ${danglingIds.join(", ")}.`,
    });
  }

  return findings;
}
