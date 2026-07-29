import type { RetrievedChunk } from "./retrieval.js";
import type { LoadedSystemModel } from "./read-system-model.js";

export const OTHER_THREATS_SYSTEM_PROMPT = `You are the Threat agent's coverage-gap sweep. The rule-pack and STRIDE generator passes have already covered some techniques for this system; you are reviewing a further batch of retrieved techniques NOT yet covered.

For every chunk provided, make an explicit decision:
- "applicable": this technique plausibly threatens a specific component in the system model. Cite the chunkId, name the attack path, pick STRIDE categories, and set entities to the specific component(s) it threatens.
- "not-applicable": explain why, choosing the closest notApplicableRationaleCategory (out-of-scope-for-framework, mitigated-by-design, no-matching-entity, duplicate-of-covered-technique, other) and writing a concrete notApplicableRationale - even a dismissal must be anchored to which entities you evaluated it against and why it doesn't apply to them.

Do not skip any chunk - every chunkId provided must appear exactly once in your decisions array.`;

function formatComponent(c: LoadedSystemModel["components"][number]): string {
  return `${c.id} (${c.type}): ${c.name} - ${c.description}`;
}

export function buildOtherThreatsUserMessage(systemModel: LoadedSystemModel, chunks: RetrievedChunk[]): string {
  return [
    `# System model\n${systemModel.components.map(formatComponent).join("\n")}`,
    `# Uncovered technique chunks to review\n${chunks
      .map((c) => `chunkId=${c.chunkId} techniqueId=${c.techniqueId} name="${c.name}" tactic="${c.tactic}"\n${c.chunkText}`)
      .join("\n\n")}`,
  ].join("\n\n");
}
