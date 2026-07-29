import { computeGroupKey } from "../../threat/group-key.js";
import type { ValidationAttackPath, ValidationFindingCandidate } from "../types.js";

const GROUP_KEY_FORMAT_RE = /^[0-9a-f]{16}$/;

export function checkGroupKeys(attackPaths: ValidationAttackPath[]): ValidationFindingCandidate[] {
  const findings: ValidationFindingCandidate[] = [];

  const seenGroupKeys = new Map<string, string[]>();
  for (const path of attackPaths) {
    const list = seenGroupKeys.get(path.groupKey) ?? [];
    list.push(path.id);
    seenGroupKeys.set(path.groupKey, list);
  }

  for (const path of attackPaths) {
    const formatValid = GROUP_KEY_FORMAT_RE.test(path.groupKey);
    findings.push({
      ruleId: "group-key-format",
      category: "group-key",
      targetId: path.id,
      passed: formatValid,
      message: formatValid ? "groupKey format is valid." : `groupKey "${path.groupKey}" does not match the expected 16-hex-char format.`,
    });

    const primaryTechniqueId = path.groundingRefs[0]?.techniqueId;
    if (primaryTechniqueId) {
      const expected = computeGroupKey(
        path.entities.map((e) => e.componentId),
        primaryTechniqueId,
      );
      const consistent = expected === path.groupKey;
      findings.push({
        ruleId: "group-key-consistency",
        category: "group-key",
        targetId: path.id,
        passed: consistent,
        message: consistent
          ? "groupKey matches the deterministic hash of its own entities and primary technique."
          : `groupKey "${path.groupKey}" does not match the recomputed hash "${expected}" for this attack path's own entities/technique - possible under-merge.`,
      });
    }

    const duplicates = seenGroupKeys.get(path.groupKey) ?? [];
    const overMerged = duplicates.length > 1;
    findings.push({
      ruleId: "group-key-no-over-merge",
      category: "group-key",
      targetId: path.id,
      passed: !overMerged,
      message: overMerged
        ? `groupKey "${path.groupKey}" is shared by ${duplicates.length} persisted attack paths (${duplicates.join(", ")}) - the Threat agent's merge pass should have deduped these into one.`
        : "groupKey is unique among persisted attack paths.",
    });
  }

  return findings;
}
