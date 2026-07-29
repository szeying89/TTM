import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import type { AgentDescriptor } from "../../orchestrator/types.js";
import { pipelineRuns } from "../../db/schema/pipeline.js";
import { loadLatestSystemModelForRun } from "../threat/read-system-model.js";
import { loadAttackPathsForSystemModel } from "../risk/read-attack-paths.js";
import { loadMitigationsForSystemModel } from "../mitigation/read-mitigations.js";
import { checkEntityAnchoring } from "./rules/entity-anchoring.js";
import { checkGroupKeys } from "./rules/group-key.js";
import { checkNotApplicableRationale } from "./rules/not-applicable-rationale.js";
import { computeCoverageCritic } from "./coverage-critic.js";
import { detectPivotNodes } from "./pivot-node-detection.js";
import { persistValidationResults } from "./persist.js";
import type { ValidationAttackPath } from "./types.js";

export interface ValidationAgentDeps {
  db: Db;
}

export function createValidationAgentDescriptor(deps: ValidationAgentDeps): AgentDescriptor {
  return {
    name: "validation",
    dependsOn: ["mitigation", "design-enrich"],
    outputs: ["ValidationFinding[]", "CoverageCriticOutput", "PivotNodeFinding[]"],
    handler: async (ctx) => {
      const [run] = await deps.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, ctx.runId)).limit(1);
      if (!run) throw new Error(`Pipeline run "${ctx.runId}" not found`);

      const systemModel = await loadLatestSystemModelForRun(deps.db, ctx.runId);
      const attackPathRows = await loadAttackPathsForSystemModel(deps.db, systemModel.systemModelId);
      const mitigations = await loadMitigationsForSystemModel(deps.db, systemModel.systemModelId);

      const attackPaths: ValidationAttackPath[] = attackPathRows.map((p) => ({
        id: p.id,
        entities: p.entities,
        groundingRefs: p.groundingRefs,
        groupKey: p.groupKey,
        applicability: p.applicability,
        notApplicableRationale: p.notApplicableRationale,
      }));

      const findings = [
        ...checkEntityAnchoring(attackPaths, systemModel.components),
        ...checkGroupKeys(attackPaths),
        ...checkNotApplicableRationale(attackPaths),
      ];

      const coverage = await computeCoverageCritic(deps.db, run.framework, attackPaths);
      const pivotNodes = detectPivotNodes(attackPaths, systemModel.dataflows, mitigations);

      const persisted = await persistValidationResults(deps.db, systemModel.systemModelId, findings, coverage, pivotNodes);

      return {
        outputRefs: [
          ...persisted.findingIds.map((id) => `validation_finding:${id}`),
          `coverage_critic:${persisted.coverageId}`,
          ...persisted.pivotNodeIds.map((id) => `pivot_node:${id}`),
        ],
      };
    },
  };
}
