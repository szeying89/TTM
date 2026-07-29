import type { RetrievedChunk } from "./retrieval.js";
import type { LoadedSystemModel } from "./read-system-model.js";
import { ALL_STRIDE_CATEGORIES, STRIDE_CATEGORY_DESCRIPTIONS } from "./stride-taxonomy.js";

export const STRIDE_GENERATOR_SYSTEM_PROMPT = `You are the Threat agent's STRIDE generator, answering Adam Shostack's second question: "What can go wrong?"

For the focus component provided, systematically consider each of the six STRIDE categories:
${ALL_STRIDE_CATEGORIES.map((c) => `- ${c}: ${STRIDE_CATEGORY_DESCRIPTIONS[c]}`).join("\n")}

You are given a list of retrieved MITRE ATT&CK/ATLAS/ICS technique chunks, each with a chunkId and techniqueId. Rules:
- Every attack path you emit MUST cite at least one groundingRef whose chunkId is copied EXACTLY from the retrieved list below. Never invent a technique ID or chunk id that is not in that list.
- Only propose attack paths that are plausible given the focus component's actual role, the dataflows connecting it to other components, and the retrieved technique content - do not propose a technique just because it was retrieved if it doesn't fit the component's context.
- entities must reference component ids from the provided system model (the focus component and, where relevant, other components it exchanges data with).
- If none of the retrieved chunks are actually applicable to this component, return an empty attackPaths array rather than forcing a weak match.
- killChainStages should be the tactic names (not shortnames) associated with the technique(s) you cited, e.g. "Initial Access".`;

function formatComponent(c: LoadedSystemModel["components"][number]): string {
  return `${c.id} (${c.type}): ${c.name} - ${c.description}${c.technologies.length ? ` [${c.technologies.join(", ")}]` : ""}`;
}

export function buildStrideGeneratorUserMessage(
  focusComponent: LoadedSystemModel["components"][number],
  systemModel: LoadedSystemModel,
  chunks: RetrievedChunk[],
): string {
  const relatedDataflows = systemModel.dataflows.filter(
    (df) => df.sourceComponentId === focusComponent.id || df.targetComponentId === focusComponent.id,
  );

  const sections = [
    `# Focus component\n${formatComponent(focusComponent)}`,
    `# Full system model (for cross-referencing entities)\n${systemModel.components.map(formatComponent).join("\n")}`,
    `# Dataflows touching the focus component\n${relatedDataflows
      .map((df) => `- ${df.sourceComponentId} -> ${df.targetComponentId} (${df.protocol ?? "protocol unspecified"})`)
      .join("\n")}`,
    `# Retrieved technique chunks\n${chunks
      .map((c) => `chunkId=${c.chunkId} techniqueId=${c.techniqueId} name="${c.name}" tactic="${c.tactic}" type=${c.chunkType}\n${c.chunkText}`)
      .join("\n\n")}`,
  ];
  return sections.join("\n\n");
}
