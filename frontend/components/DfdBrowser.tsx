"use client";

import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AttackPathWithRisk, SystemModelResponse } from "../lib/types";

const COMPONENT_WIDTH = 180;
const COMPONENT_HEIGHT = 60;
const COMPONENT_GAP_X = 220;
const BOUNDARY_PADDING_TOP = 50;
const BOUNDARY_GAP_Y = 220;

function buildLayout(model: SystemModelResponse): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const componentById = new Map(model.components.map((c) => [c.id, c]));
  const boundaryOf = new Map(model.components.map((c) => [c.id, c.trustBoundaryId]));
  const grouped = new Map<string | null, string[]>();
  for (const component of model.components) {
    const key = component.trustBoundaryId;
    const list = grouped.get(key) ?? [];
    list.push(component.id);
    grouped.set(key, list);
  }

  let boundaryRow = 0;
  for (const boundary of model.trustBoundaries) {
    const memberIds = grouped.get(boundary.id) ?? [];
    const width = Math.max(memberIds.length * COMPONENT_GAP_X + 40, 260);
    nodes.push({
      id: `boundary:${boundary.id}`,
      position: { x: 0, y: boundaryRow * BOUNDARY_GAP_Y },
      data: { label: boundary.name },
      style: {
        width,
        height: BOUNDARY_PADDING_TOP + COMPONENT_HEIGHT + 30,
        background: "rgba(100, 130, 220, 0.08)",
        border: "1px dashed #6482dc",
        borderRadius: 8,
        fontSize: "0.8rem",
        fontWeight: 600,
        padding: "0.35rem 0.5rem",
      },
    });
    memberIds.forEach((id, index) => {
      const component = componentById.get(id);
      if (!component) return;
      nodes.push({
        id: component.id,
        parentId: `boundary:${boundary.id}`,
        extent: "parent",
        position: { x: 20 + index * COMPONENT_GAP_X, y: BOUNDARY_PADDING_TOP },
        data: { label: `${component.name}\n(${component.type})` },
        style: {
          width: COMPONENT_WIDTH,
          height: COMPONENT_HEIGHT,
          fontSize: "0.8rem",
          whiteSpace: "pre-line",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      });
    });
    boundaryRow += 1;
  }

  const ungrouped = grouped.get(null) ?? grouped.get(undefined as unknown as string) ?? [];
  ungrouped.forEach((id, index) => {
    const component = componentById.get(id);
    if (!component) return;
    nodes.push({
      id: component.id,
      position: { x: index * COMPONENT_GAP_X, y: boundaryRow * BOUNDARY_GAP_Y },
      data: { label: `${component.name}\n(${component.type})` },
      style: {
        width: COMPONENT_WIDTH,
        height: COMPONENT_HEIGHT,
        fontSize: "0.8rem",
        whiteSpace: "pre-line",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    });
  });

  const edges: Edge[] = model.dataflows.map((flow) => ({
    id: flow.id,
    source: flow.sourceComponentId,
    target: flow.targetComponentId,
    label: flow.name,
    animated: flow.crossesTrustBoundaryIds.length > 0,
    style: flow.crossesTrustBoundaryIds.length > 0 ? { stroke: "#c0392b" } : undefined,
  }));

  void boundaryOf;
  return { nodes, edges };
}

export function DfdBrowser({
  model,
  attackPaths,
  onSelectComponent,
}: {
  model: SystemModelResponse;
  attackPaths: AttackPathWithRisk[];
  onSelectComponent?: (componentId: string | null) => void;
}) {
  const { nodes, edges } = useMemo(() => buildLayout(model), [model]);
  const [selected, setSelected] = useState<string | null>(null);

  const pathCountByComponent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const path of attackPaths) {
      for (const entity of path.entities) {
        counts.set(entity.componentId, (counts.get(entity.componentId) ?? 0) + 1);
      }
    }
    return counts;
  }, [attackPaths]);

  const styledNodes = nodes.map((node) => {
    if (node.id.startsWith("boundary:")) return node;
    const count = pathCountByComponent.get(node.id) ?? 0;
    const isSelected = node.id === selected;
    return {
      ...node,
      style: {
        ...node.style,
        border: isSelected ? "2px solid #0645ad" : count > 0 ? "1px solid #c0392b" : "1px solid #999",
        background: isSelected ? "#eef3ff" : "#fff",
      },
    };
  });

  return (
    <div style={{ height: 480, border: "1px solid #ddd", borderRadius: 6 }}>
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        fitView
        onNodeClick={(_, node) => {
          if (node.id.startsWith("boundary:")) return;
          const next = node.id === selected ? null : node.id;
          setSelected(next);
          onSelectComponent?.(next);
        }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
