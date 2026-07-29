import type { AttackPath, StrideCategory } from "@intel-threat-modeller/contracts";

const PASS_PRIORITY: Record<AttackPath["sourcePass"], number> = {
  "rule-pack": 0,
  "stride-llm": 1,
  "other-threats": 2,
};

// Same groupKey (same entity set + technique) can surface from more than one
// pass. Keep the higher-priority pass's identity/applicability call (deterministic
// rule-pack outranks LLM passes), but union the STRIDE categories and
// grounding refs so nothing either pass found is lost.
export function mergeAttackPaths(passes: AttackPath[][]): AttackPath[] {
  const byGroupKey = new Map<string, AttackPath>();

  for (const attackPaths of passes) {
    for (const candidate of attackPaths) {
      const existing = byGroupKey.get(candidate.groupKey);
      if (!existing) {
        byGroupKey.set(candidate.groupKey, candidate);
        continue;
      }

      const keepCandidateAsBase = PASS_PRIORITY[candidate.sourcePass] < PASS_PRIORITY[existing.sourcePass];
      const base = keepCandidateAsBase ? candidate : existing;
      const other = keepCandidateAsBase ? existing : candidate;

      const strideCategories = Array.from(
        new Set([...base.strideCategories, ...other.strideCategories]),
      ) as StrideCategory[];
      const groundingRefsByChunkId = new Map(
        [...base.groundingRefs, ...other.groundingRefs].map((ref) => [ref.chunkId, ref]),
      );

      byGroupKey.set(candidate.groupKey, {
        ...base,
        strideCategories,
        groundingRefs: Array.from(groundingRefsByChunkId.values()),
      });
    }
  }

  return Array.from(byGroupKey.values());
}
