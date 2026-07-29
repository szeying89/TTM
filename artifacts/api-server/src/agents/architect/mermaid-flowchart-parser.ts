// `@mermaid-js/parser` (the official Langium-based parser, v1.2.0) does not yet
// support the `flowchart`/`graph` diagram type - only info, packet, pie,
// architecture, gitGraph, and several other diagram kinds have been migrated to
// it. Flowchart is by far the most common syntax for system/dataflow-style
// design docs, so this is a small hand-rolled parser covering the common
// subset: node shapes, labeled/unlabeled edges of the common arrow styles, and
// `subgraph ... end` blocks (used here as trust-boundary hints). It does not
// implement the full flowchart grammar (styling directives, click handlers,
// nested subgraphs beyond one level, etc).

export interface FlowchartNode {
  id: string;
  label: string;
  subgraphId?: string;
}

export interface FlowchartEdge {
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface FlowchartSubgraph {
  id: string;
  label: string;
}

export interface FlowchartAst {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  subgraphs: FlowchartSubgraph[];
}

const DIRECTION_RE = /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)\s*$/i;
const SUBGRAPH_START_RE = /^\s*subgraph\s+([A-Za-z0-9_-]+)(?:\s*\[(?:"([^"]*)"|([^\]]*))\])?\s*$/i;
const SUBGRAPH_END_RE = /^\s*end\s*$/i;
const COMMENT_RE = /^\s*%%.*$/;

// A node reference: id, optionally followed by a shape delimiter pair
// containing its label, e.g. `A[Label]`, `A(Label)`, `A((Label))`,
// `A{Label}`, `A{{Label}}`, `A[[Label]]`, `A>Label]`.
const NODE_RE =
  /^([A-Za-z0-9_-]+)(?:(\[\[.*?\]\]|\(\(.*?\)\)|\{\{.*?\}\}|\[\(.*?\)\]|\[.*?\]|\(.*?\)|\{.*?\}|>.*?\]))?$/;

// Arrow operators, longest-match-first so e.g. `-->` isn't split as `--` + `>`.
const ARROW_RE = /(-\.-+>|-\.-+|={1,3}>|-{2,3}>|~{1,3}|-{2,3})(\|[^|]*\|)?/;

const DOUBLE_DELIMITER_PREFIXES = ["((", "[[", "{{", "[("];

function stripShapeDelimiters(raw: string): string {
  const isDouble = DOUBLE_DELIMITER_PREFIXES.some((prefix) => raw.startsWith(prefix));
  return (isDouble ? raw.slice(2, -2) : raw.slice(1, -1)).trim();
}

function parseNodeToken(token: string): { id: string; label?: string } | undefined {
  const match = NODE_RE.exec(token.trim());
  if (!match) return undefined;
  const id = match[1]!;
  const shaped = match[2];
  if (!shaped) return { id };
  const label = shaped.startsWith(">") ? shaped.slice(1, -1).trim() : stripShapeDelimiters(shaped);
  return { id, label };
}

export function parseFlowchart(mermaidText: string): FlowchartAst {
  const nodesById = new Map<string, FlowchartNode>();
  const edges: FlowchartEdge[] = [];
  const subgraphs: FlowchartSubgraph[] = [];
  const subgraphStack: string[] = [];

  const upsertNode = (id: string, label?: string) => {
    const existing = nodesById.get(id);
    const subgraphId = subgraphStack[subgraphStack.length - 1];
    if (existing) {
      if (label) existing.label = label;
      if (subgraphId && !existing.subgraphId) existing.subgraphId = subgraphId;
      return;
    }
    nodesById.set(id, { id, label: label ?? id, subgraphId });
  };

  const lines = mermaidText.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || COMMENT_RE.test(line) || DIRECTION_RE.test(line)) continue;

    if (SUBGRAPH_END_RE.test(line)) {
      subgraphStack.pop();
      continue;
    }

    const subgraphMatch = SUBGRAPH_START_RE.exec(line);
    if (subgraphMatch) {
      const id = subgraphMatch[1]!;
      const label = subgraphMatch[2] ?? subgraphMatch[3] ?? id;
      subgraphs.push({ id, label });
      subgraphStack.push(id);
      continue;
    }

    // Split the line into alternating node-tokens and arrow-operators.
    const parts: string[] = [];
    let remaining = line;
    let match: RegExpExecArray | null;
    while ((match = ARROW_RE.exec(remaining))) {
      parts.push(remaining.slice(0, match.index).trim());
      parts.push(match[0]);
      remaining = remaining.slice(match.index + match[0].length);
    }
    parts.push(remaining.trim());

    if (parts.length === 1) {
      // A bare node declaration line with no edges.
      const node = parseNodeToken(parts[0]!);
      if (node) upsertNode(node.id, node.label);
      continue;
    }

    let previousId: string | undefined;
    for (let i = 0; i < parts.length; i += 2) {
      const nodeToken = parts[i];
      if (!nodeToken) continue;
      const node = parseNodeToken(nodeToken);
      if (!node) continue;
      upsertNode(node.id, node.label);

      if (previousId) {
        const arrowToken = parts[i - 1]!;
        const labelMatch = /\|([^|]*)\|/.exec(arrowToken);
        edges.push({
          sourceId: previousId,
          targetId: node.id,
          label: labelMatch?.[1]?.trim() || undefined,
        });
      }
      previousId = node.id;
    }
  }

  return { nodes: Array.from(nodesById.values()), edges, subgraphs };
}
