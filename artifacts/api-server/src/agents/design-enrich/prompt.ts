import type { LoadedSystemModel } from "../threat/read-system-model.js";
import type { RankedAttackPath } from "../risk/read-risk-scores.js";

export const DESIGN_ENRICH_SYSTEM_PROMPT = `You are the Design-Enrich agent, refining the system model based on what the ranked attack paths revealed.

Produce:
- assumptions: statements the threat model is implicitly relying on (e.g. "the API Gateway terminates TLS before forwarding requests") - mark source "explicit" if the design doc said so directly, "inferred" if you're inferring it from context. relatedComponentIds should reference real component ids where relevant.
- designDeltas: concrete suggested corrections/refinements to the system model itself (a missing trust boundary, a dataflow whose classification should be tightened, a component that should be split) that the highest-ranked attack paths suggest are needed - each with a kind, an optional targetId (a component/dataflow/trust-boundary id this delta concerns), and a description.

Only produce entries that are genuinely useful given the ranked attack paths - do not pad with generic observations.`;

export function buildDesignEnrichUserMessage(
  systemModel: LoadedSystemModel,
  rankedAttackPaths: RankedAttackPath[],
): string {
  const components = systemModel.components
    .map((c) => `${c.id} (${c.type}): ${c.name} - ${c.description}`)
    .join("\n");
  const topPaths = rankedAttackPaths
    .filter((p) => p.applicability === "applicable")
    .slice(0, 15)
    .map((p) => `rank=${p.rank} score=${p.score} name="${p.name}"`)
    .join("\n");

  return `# System components\n${components}\n\n# Top-ranked attack paths\n${topPaths}`;
}
