"use client";

import { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  NodeTypes,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import PersonNode from "./PersonNode";
import CoupleNode from "./CoupleNode";
import FamilyEdge from "./FamilyEdge";
import { buildTreeLayout, PersonData, RelationshipData, MarriageData } from "@/lib/tree-layout";

// Centers the viewport on the selected person node whenever selection changes.
// Must be rendered inside <ReactFlow> to access useReactFlow().
function AutoCenter({ selectedPersonId, nodes }: { selectedPersonId?: string; nodes: Node[] }) {
  const { setCenter, getZoom } = useReactFlow();

  useEffect(() => {
    if (!selectedPersonId) return;
    const node = nodes.find((n) => n.id === selectedPersonId);
    if (!node) return;
    // PersonNode is w-44 (176px) wide; height ~88px
    const cx = node.position.x + 88;
    const cy = node.position.y + 44;
    setCenter(cx, cy, { zoom: Math.max(getZoom(), 0.8), duration: 500 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId]);

  return null;
}

const nodeTypes: NodeTypes = {
  personNode: PersonNode,
  coupleNode: CoupleNode,
};

const edgeTypes = {
  familyEdge: FamilyEdge,
};

interface TreeViewProps {
  persons: PersonData[];
  relationships: RelationshipData[];
  marriages: MarriageData[];
  onPersonSelect: (person: PersonData | null) => void;
  selectedPersonId?: string;
  highlightSet?: Set<string> | null;
}

export default function TreeView({
  persons,
  relationships,
  marriages,
  onPersonSelect,
  selectedPersonId,
  highlightSet,
}: TreeViewProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildTreeLayout(persons, relationships, marriages),
    [persons, relationships, marriages]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Apply highlight/dim styling based on current selection
  const styledNodes = useMemo(() => {
    if (!highlightSet) return nodes;
    return nodes.map((n) => {
      const active = highlightSet.has(n.id);
      return {
        ...n,
        selected: n.id === selectedPersonId,
        style: {
          opacity: active ? 1 : 0.12,
          transition: "opacity 0.2s ease",
        },
      };
    });
  }, [nodes, highlightSet, selectedPersonId]);

  const styledEdges = useMemo(() => {
    if (!highlightSet) return edges;
    return edges.map((e) => {
      const active = highlightSet.has(e.source) && highlightSet.has(e.target);
      return {
        ...e,
        style: {
          ...e.style,
          opacity: active ? 1 : 0.06,
          transition: "opacity 0.2s ease",
        },
      };
    });
  }, [edges, highlightSet]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "personNode") {
        onPersonSelect(node.data as unknown as PersonData);
      } else {
        onPersonSelect(null);
      }
    },
    [onPersonSelect]
  );

  const onPaneClick = useCallback(() => {
    onPersonSelect(null);
  }, [onPersonSelect]);

  return (
    <div className="w-full h-full">
      <style>{`.react-flow__handle { opacity: 0 !important; background: transparent !important; border-color: transparent !important; }`}</style>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <AutoCenter selectedPersonId={selectedPersonId} nodes={nodes} />
        <Background color="#cbd5e1" gap={20} size={1.5} variant={BackgroundVariant.Dots} />
        <Controls
          className="!border-slate-200 !shadow-sm !rounded-xl overflow-hidden"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "coupleNode") return "#e2e8f0";
            const person = node.data as unknown as PersonData;
            if (person?.jenis_kelamin === "LAKI_LAKI") return "#bfdbfe";
            return "#fce7f3";
          }}
          className="!border-slate-200 !shadow-sm !rounded-xl overflow-hidden"
          style={{ width: 120, height: 80 }}
          maskColor="rgba(248,250,252,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
