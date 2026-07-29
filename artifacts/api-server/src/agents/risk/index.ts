import { eq } from "drizzle-orm";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { CriFunction, CriMaturityTier, StrideCategory } from "@intel-threat-modeller/contracts";
import type { Db } from "../../db/client.js";
import type { AgentDescriptor } from "../../orchestrator/types.js";
import { pipelineRuns } from "../../db/schema/pipeline.js";
import { projects } from "../../db/schema/projects.js";
import { loadLatestSystemModelForRun } from "../threat/read-system-model.js";
import { loadAttackPathsForSystemModel } from "./read-attack-paths.js";
import { loadIntelSignalsForProject } from "./read-intel-signals.js";
import { computeRiskFactors } from "./risk-rubric.js";
import { computeCriAdjustment } from "./cri-profile.js";
import { computeIntelAdjustment } from "./intel-adjustment.js";
import { buildRiskRationaleUserMessage, RISK_RATIONALE_SYSTEM_PROMPT, type RiskFactorSummary } from "./rationale-prompt.js";
import { RiskRationaleOutput } from "./rationale-schema.js";
import { persistRiskScores, type RiskScoreToPersist } from "./persist.js";

export interface RiskAgentDeps {
  db: Db;
  llmClient: LLMClient;
  model?: string;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fallbackRationale(summary: RiskFactorSummary): string {
  const parts = [`Base score ${summary.baseScore} from likelihood ${summary.likelihood.toFixed(2)} and impact ${summary.impact.toFixed(2)}.`];
  parts.push(`CRI "${summary.criFunction}" maturity "${summary.criMaturityTier}" applies a ${summary.criModifier >= 0 ? "+" : ""}${(summary.criModifier * 100).toFixed(0)}% adjustment.`);
  if (summary.intelModifier !== undefined) {
    parts.push(`Threat-intel signals apply a further +${(summary.intelModifier * 100).toFixed(0)}% adjustment.`);
  }
  return parts.join(" ");
}

export function createRiskAgentDescriptor(deps: RiskAgentDeps): AgentDescriptor {
  const model = deps.model ?? process.env.LLM_DEFAULT_MODEL ?? "claude-opus-5";

  return {
    name: "risk",
    dependsOn: ["threat"],
    outputs: ["RiskScore[]"],
    handler: async (ctx) => {
      const [run] = await deps.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, ctx.runId)).limit(1);
      if (!run) throw new Error(`Pipeline run "${ctx.runId}" not found`);

      const [project] = await deps.db.select().from(projects).where(eq(projects.id, run.projectId)).limit(1);
      if (!project) throw new Error(`Project "${run.projectId}" not found`);
      const criMaturity = project.criMaturity as Partial<Record<CriFunction, CriMaturityTier>>;

      const systemModel = await loadLatestSystemModelForRun(deps.db, ctx.runId);
      const attackPaths = await loadAttackPathsForSystemModel(deps.db, systemModel.systemModelId);
      const intelSignals = await loadIntelSignalsForProject(deps.db, run.projectId);

      const scored = attackPaths.map((attackPath) => {
        const factors = computeRiskFactors(attackPath, systemModel);
        const criAdjustment = computeCriAdjustment(attackPath.strideCategories as StrideCategory[], criMaturity);
        const intelAdjustment = computeIntelAdjustment(attackPath, intelSignals);

        const totalModifier = criAdjustment.modifier + (intelAdjustment?.modifier ?? 0);
        const score = clampScore(factors.baseScore * (1 + totalModifier));

        return { attackPath, factors, criAdjustment, intelAdjustment, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const computed = scored.map((c, i) => ({ ...c, rank: i + 1 }));

      const summaries: RiskFactorSummary[] = computed.map((c) => ({
        attackPathId: c.attackPath.id,
        name: c.attackPath.name,
        likelihood: c.factors.likelihood,
        impact: c.factors.impact,
        baseScore: c.factors.baseScore,
        criFunction: c.criAdjustment.function,
        criMaturityTier: c.criAdjustment.maturityTier,
        criModifier: c.criAdjustment.modifier,
        intelModifier: c.intelAdjustment?.modifier,
        intelSummary: c.intelAdjustment?.rationale,
        finalScore: c.score,
      }));

      let rationaleByAttackPathId = new Map<string, string>();
      if (summaries.length > 0) {
        try {
          const { data } = await deps.llmClient.completeStructured<RiskRationaleOutput>({
            model,
            system: RISK_RATIONALE_SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildRiskRationaleUserMessage(summaries) }],
            schema: RiskRationaleOutput,
            schemaName: "RiskRationaleOutput",
            maxTokens: 4096,
          });
          rationaleByAttackPathId = new Map(data.rationales.map((r) => [r.attackPathId, r.rationale]));
        } catch {
          // Fall through to deterministic per-path rationale below.
        }
      }

      const toPersist: RiskScoreToPersist[] = computed.map((c) => {
        const summary = summaries.find((s) => s.attackPathId === c.attackPath.id)!;
        return {
          attackPathId: c.attackPath.id,
          likelihood: c.factors.likelihood,
          impact: c.factors.impact,
          baseScore: c.factors.baseScore,
          criAdjustment: c.criAdjustment,
          intelAdjustment: c.intelAdjustment,
          score: c.score,
          rank: c.rank,
          heatmapCell: c.factors.heatmapCell,
          rationale: rationaleByAttackPathId.get(c.attackPath.id) ?? fallbackRationale(summary),
        };
      });

      const riskScoreIds = await persistRiskScores(deps.db, toPersist);
      return { outputRefs: riskScoreIds.map((id) => `risk_score:${id}`) };
    },
  };
}
