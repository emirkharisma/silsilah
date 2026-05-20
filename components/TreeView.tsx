"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  NodeTypes,
  useNodesState,
  useEdgesState,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import PersonNode from "./PersonNode";
import CoupleNode from "./CoupleNode";
import FamilyEdge from "./FamilyEdge";
import { buildTreeLayout, PersonData, RelationshipData, MarriageData } from "@/lib/tree-layout";

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
