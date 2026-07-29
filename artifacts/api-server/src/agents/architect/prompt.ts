import type { FlowchartAst } from "./mermaid-flowchart-parser.js";

export const ARCHITECT_SYSTEM_PROMPT = `You are the Architect agent in a threat-modelling pipeline, answering Adam Shostack's first question: "What are we working on?"

Given a system design document (prose) and, optionally, a deterministically-parsed scaffold of an accompanying Mermaid flowchart diagram, extract:
- components: every process, datastore, external entity, and actor in the system
- dataflows: every data exchange between two components
- trustBoundaries: every security/administrative boundary that groups components

Rules:
- The parsed Mermaid scaffold (if provided) is ground truth for which nodes and edges exist - do not invent components or dataflows that appear in neither the prose nor the diagram.
- You MAY infer trust boundaries not explicitly drawn as Mermaid subgraphs when the prose clearly implies one (e.g. "the database sits in a private subnet" implies a boundary separate from public-facing components).
- Every component's sourceRefs must cite where it came from: the Mermaid node id (e.g. "mermaid:API") and/or a short quote from the prose.
- Assign each component a stable, short, kebab-case id (e.g. "web-browser", "auth-api") - reuse the Mermaid node id as the component id when the diagram is the source.
- Each dataflow's sourceComponentId/targetComponentId must reference component ids you defined in this same response.
- Each trust boundary's componentIds must reference component ids you defined in this same response, and each component inside a boundary must set its own trustBoundaryId to that boundary's id.
- crossesTrustBoundaryIds on a dataflow should list every trust boundary id whose membership differs between the dataflow's source and target components.`;

function formatFlowchartAst(ast: FlowchartAst): string {
  const lines: string[] = [];
  if (ast.subgraphs.length > 0) {
    lines.push("Subgraphs (trust-boundary hints):");
    for (const sg of ast.subgraphs) lines.push(`  - ${sg.id}: "${sg.label}"`);
  }
  lines.push("Nodes:");
  for (const node of ast.nodes) {
    const boundary = node.subgraphId ? ` (in subgraph ${node.subgraphId})` : "";
    lines.push(`  - ${node.id}: "${node.label}"${boundary}`);
  }
  lines.push("Edges:");
  for (const edge of ast.edges) {
    const label = edge.label ? ` [${edge.label}]` : "";
    lines.push(`  - ${edge.sourceId} -> ${edge.targetId}${label}`);
  }
  return lines.join("\n");
}

export function buildArchitectUserMessage(prose: string, flowchartAst: FlowchartAst | undefined): string {
  const sections = [`# Design document (prose)\n\n${prose.trim() || "(none provided)"}`];
  if (flowchartAst && (flowchartAst.nodes.length > 0 || flowchartAst.edges.length > 0)) {
    sections.push(`# Parsed Mermaid flowchart scaffold\n\n${formatFlowchartAst(flowchartAst)}`);
  }
  return sections.join("\n\n");
}
