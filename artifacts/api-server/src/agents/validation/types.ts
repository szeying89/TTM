export interface ValidationAttackPath {
  id: string;
  entities: { componentId: string; role: string }[];
  groundingRefs: { techniqueId: string; framework: string; chunkId: string; retrievalScore: number }[];
  groupKey: string;
  applicability: string;
  notApplicableRationale: string | null;
}

export interface ValidationComponent {
  id: string;
  type: string;
}

export interface ValidationFindingCandidate {
  ruleId: string;
  category: "entity-anchoring" | "group-key" | "not-applicable-rationale" | "coverage" | "pivot-node";
  targetId: string;
  passed: boolean;
  message: string;
}
