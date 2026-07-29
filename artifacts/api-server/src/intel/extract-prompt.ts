import type { RetrievedChunk } from "../agents/threat/retrieval.js";

export const INTEL_EXTRACTION_SYSTEM_PROMPT = `You are extracting structured threat-intelligence signals from a submitted article or advisory (a URL or PDF the user uploaded) to feed into a threat model's risk scoring.

You are given a list of retrieved MITRE technique chunks (each with a chunkId and techniqueId) that are candidate matches for what this document discusses, and a list of the project's known system components. Rules:
- Every signal's relatedTechniqueChunkIds MUST be copied EXACTLY from the retrieved chunkIds below - never invent a technique id not in that list. If the document doesn't clearly describe any of the retrieved techniques, do not emit a signal for it.
- signalType: "active-exploitation" if the text describes real-world/in-the-wild exploitation; "threat-actor-targeting" if it describes a specific actor/campaign targeting a sector or organization type; "cve-severity" if it centers on a specific CVE's severity/exploitability; "sector-relevance" if it discusses risk to an industry/sector without describing active exploitation; "other" otherwise.
- relatedComponentIds: only include component ids from the provided list if the document's subject matter plausibly affects that kind of component (e.g. a database CVE relates to datastore components) - leave empty if there's no clear match, that's fine.
- severity and confidence are both 0-1: severity reflects how impactful the described activity is, confidence reflects how certain you are the match to the cited technique(s) is correct.
- summary should be a concise (1-3 sentence) restatement of the specific finding, not a restatement of the whole document.`;

export function buildIntelExtractionUserMessage(
  documentText: string,
  chunks: RetrievedChunk[],
  components: { id: string; name: string; type: string }[],
): string {
  const truncated = documentText.length > 12000 ? `${documentText.slice(0, 12000)}\n[...truncated]` : documentText;
  return [
    `# Submitted document text\n\n${truncated}`,
    `# Retrieved candidate technique chunks\n${chunks
      .map((c) => `chunkId=${c.chunkId} techniqueId=${c.techniqueId} name="${c.name}"\n${c.chunkText}`)
      .join("\n\n")}`,
    `# Known system components\n${components.map((c) => `${c.id} (${c.type}): ${c.name}`).join("\n") || "(none)"}`,
  ].join("\n\n");
}
