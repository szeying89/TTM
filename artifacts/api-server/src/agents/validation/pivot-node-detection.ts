import type { ValidationAttackPath } from "./types.js";

const MIN_ATTACK_PATH_COUNT = 3;
const MIN_BOUNDARY_CROSSING_COUNT = 2;

export interface PivotNodeFinding {
  componentId: string;
  attackPathCount: number;
  trustBoundaryCrossingCount: number;
  linkedMitigationIds: string[];
}

export function detectPivotNodes(
  attackPaths: ValidationAttackPath[],
  dataflows: { sourceComponentId: string; targetComponentId: string; crossesTrustBoundaryIds: string[] }[],
  mitigations: { id: string; attackPathIds: string[] }[],
): PivotNodeFinding[] {
  const attackPathCountByComponent = new Map<string, Set<string>>();
  for (const path of attackPaths) {
    for (const entity of path.entities) {
      const set = attackPathCountByComponent.get(entity.componentId) ?? new Set<string>();
      set.add(path.id);
      attackPathCountByComponent.set(entity.componentId, set);
    }
  }

  const crossingCountByComponent = new Map<string, number>();
  for (const df of dataflows) {
    if (df.crossesTrustBoundaryIds.length === 0) continue;
    for (const componentId of [df.sourceComponentId, df.targetComponentId]) {
      crossingCountByComponent.set(componentId, (crossingCountByComponent.get(componentId) ?? 0) + 1);
    }
  }

  const mitigationsByAttackPathId = new Map<string, string[]>();
  for (const mitigation of mitigations) {
    for (const attackPathId of mitigation.attackPathIds) {
      const list = mitigationsByAttackPathId.get(attackPathId) ?? [];
      list.push(mitigation.id);
      mitigationsByAttackPathId.set(attackPathId, list);
    }
  }

  const findings: PivotNodeFinding[] = [];
  for (const [componentId, attackPathIds] of attackPathCountByComponent) {
    const attackPathCount = attackPathIds.size;
    const trustBoundaryCrossingCount = crossingCountByComponent.get(componentId) ?? 0;
    const isPivotNode = attackPathCount >= MIN_ATTACK_PATH_COUNT || trustBoundaryCrossingCount >= MIN_BOUNDARY_CROSSING_COUNT;
    if (!isPivotNode) continue;

    const linkedMitigationIds = Array.from(
      new Set(Array.from(attackPathIds).flatMap((id) => mitigationsByAttackPathId.get(id) ?? [])),
    );

    findings.push({ componentId, attackPathCount, trustBoundaryCrossingCount, linkedMitigationIds });
  }

  return findings.sort((a, b) => b.attackPathCount - a.attackPathCount);
}
