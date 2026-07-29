import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";

/**
 * A schema-dispatching stand-in for a real LLM, used to drive the pipeline end-to-end in the
 * Playwright e2e test (and any CI "fast path" run) without live Anthropic calls. Every agent's
 * completeStructured() call is answered by parsing the same `chunkId=<id> techniqueId=<id>` /
 * `id=<id>` / `attackPathId=<id>` tokens the real prompts embed in their user message (see
 * agents/threat/stride-generator-prompt.ts, other-threats-prompt.ts, mitigation/prompt.ts,
 * design-enrich/prompt.ts, risk/rationale-prompt.ts, intel/extract-prompt.ts) so that every
 * id it echoes back is guaranteed to resolve against the caller's validity check instead of
 * being silently filtered out.
 */
export class CannedLLMClient implements LLMClient {
  async complete(): Promise<never> {
    throw new Error("CannedLLMClient.complete() is not used by any agent - only completeStructured() is called.");
  }

  async completeStructured<T>(req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
    const content = req.messages.map((m) => m.content).join("\n\n");
    const data = buildCannedResponse(req.schemaName, content);
    return { data: req.schema.parse(data) as T, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

function extractPairs(content: string, pattern: RegExp): { chunkId: string; techniqueId: string }[] {
  const results: { chunkId: string; techniqueId: string }[] = [];
  for (const match of content.matchAll(pattern)) {
    results.push({ chunkId: match[1]!, techniqueId: match[2]! });
  }
  return results;
}

function extractIds(content: string, pattern: RegExp): string[] {
  return [...content.matchAll(pattern)].map((m) => m[1]!);
}

function focusComponentId(content: string): string | undefined {
  const match = content.match(/# Focus component\n(\S+)/);
  return match?.[1];
}

function firstSystemComponentId(content: string, heading: string): string | undefined {
  const match = content.match(new RegExp(`${heading}\\n(\\S+)`));
  return match?.[1];
}

function buildCannedResponse(schemaName: string, content: string): unknown {
  switch (schemaName) {
    case "ArchitectOutput":
      return {
        components: [
          {
            id: "Browser",
            name: "Web Browser",
            type: "actor",
            description: "End user's browser",
            technologies: [],
            trustBoundaryId: "Public",
            sourceRefs: ["mermaid:Browser"],
          },
          {
            id: "API",
            name: "API Gateway",
            type: "process",
            description: "Public REST API",
            technologies: ["REST"],
            trustBoundaryId: "Public",
            sourceRefs: ["mermaid:API"],
          },
          {
            id: "DB",
            name: "Order Database",
            type: "datastore",
            description: "PostgreSQL order database",
            technologies: ["PostgreSQL"],
            trustBoundaryId: "Internal",
            sourceRefs: ["mermaid:DB"],
          },
        ],
        dataflows: [
          {
            id: "df1",
            name: "Browser to API",
            sourceComponentId: "Browser",
            targetComponentId: "API",
            protocol: "HTTPS",
            crossesTrustBoundaryIds: [],
          },
          {
            id: "df2",
            name: "API to DB",
            sourceComponentId: "API",
            targetComponentId: "DB",
            protocol: "SQL",
            crossesTrustBoundaryIds: ["Internal"],
          },
        ],
        trustBoundaries: [
          { id: "Public", name: "Public-facing tier", componentIds: [] },
          { id: "Internal", name: "Internal network", componentIds: [] },
        ],
      };

    case "StrideGeneratorOutput": {
      const pairs = extractPairs(content, /chunkId=(\S+)\s+techniqueId=(\S+)/g);
      const componentId = focusComponentId(content);
      if (pairs.length === 0 || !componentId) return { attackPaths: [] };
      const { chunkId, techniqueId } = pairs[0]!;
      return {
        attackPaths: [
          {
            name: `Spoofing threat against ${componentId}`,
            strideCategories: ["spoofing"],
            entities: [{ componentId, role: "target" }],
            killChainStages: ["Initial Access"],
            groundingRefs: [{ techniqueId, chunkId }],
          },
        ],
      };
    }

    case "OtherThreatsOutput": {
      const pairs = extractPairs(content, /chunkId=(\S+)\s+techniqueId=(\S+)/g);
      const componentId = firstSystemComponentId(content, "# System model");
      if (pairs.length === 0 || !componentId) return { decisions: [] };
      return {
        decisions: pairs.map((pair, index) =>
          index === 0
            ? {
                chunkId: pair.chunkId,
                decision: "applicable",
                name: `Coverage-sweep finding on ${componentId}`,
                strideCategories: ["information-disclosure"],
                entities: [{ componentId, role: "target" }],
                killChainStages: ["Collection"],
              }
            : {
                chunkId: pair.chunkId,
                decision: "not-applicable",
                name: `Reviewed technique ${pair.techniqueId}`,
                entities: [{ componentId, role: "reviewed" }],
                notApplicableRationaleCategory: "no-matching-entity",
                notApplicableRationale: `No component in this system model plausibly exposes technique ${pair.techniqueId}.`,
              },
        ),
      };
    }

    case "RiskRationaleOutput": {
      const attackPathIds = extractIds(content, /attackPathId=(\S+)/g);
      return {
        rationales: attackPathIds.map((attackPathId) => ({
          attackPathId,
          rationale: "Score reflects the deterministic likelihood/impact rubric plus any CRI or intel adjustments shown above.",
        })),
      };
    }

    case "MitigationOutput": {
      const attackPathIds = extractIds(content, /id=(\S+)/g);
      if (attackPathIds.length === 0) return { recommendations: [] };
      return {
        recommendations: [
          {
            attackPathIds: attackPathIds.slice(0, Math.min(2, attackPathIds.length)),
            controlFamily: "Access Control",
            criFunction: "protect",
            criDiagnosticStatement: "The organization enforces least-privilege access to the affected components.",
            title: "Enforce least-privilege access controls",
            description: "Restrict access to the affected components to the minimum set of identities and permissions required.",
          },
        ],
      };
    }

    case "DesignEnrichOutput": {
      const componentId = firstSystemComponentId(content, "# System components");
      return {
        assumptions: componentId
          ? [{ statement: `${componentId} is assumed to enforce transport encryption.`, relatedComponentIds: [componentId], source: "inferred" }]
          : [],
        designDeltas: [],
      };
    }

    case "AudienceSummary":
      return {
        summary: "This system model was threat-modelled with grounded MITRE technique references and CRI-contextualized risk scoring.",
        keyRecommendations: ["Prioritize the highest-ranked attack paths for remediation first."],
      };

    case "IntelExtractionOutput": {
      const pairs = extractPairs(content, /chunkId=(\S+)\s+techniqueId=(\S+)/g);
      const componentId = firstSystemComponentId(content, "# Known system components");
      if (pairs.length === 0) return { signals: [] };
      const { chunkId } = pairs[0]!;
      return {
        signals: [
          {
            signalType: "active-exploitation",
            relatedTechniqueChunkIds: [chunkId],
            relatedComponentIds: componentId ? [componentId] : [],
            severity: 0.9,
            summary: "The submitted advisory describes active, in-the-wild exploitation of this technique.",
            confidence: 0.85,
          },
        ],
      };
    }

    default:
      throw new Error(`CannedLLMClient: no canned response configured for schemaName "${schemaName}"`);
  }
}
