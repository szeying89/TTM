import { createHash } from "node:crypto";

// Deterministic dedup key: the same underlying threat instantiated against
// the same set of entities always merges to one AttackPath, regardless of
// which pass (rule-pack / stride-llm / other-threats) produced it.
export function computeGroupKey(entityComponentIds: string[], techniqueId: string): string {
  const sorted = [...entityComponentIds].sort();
  return createHash("sha256").update(`${sorted.join(",")}|${techniqueId}`).digest("hex").slice(0, 16);
}
