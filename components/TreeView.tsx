"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
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
import { buildTreeLayout, PersonData, RelationshipData, MarriageData } from "@/lib/tree-layout";

const nodeTypes: NodeTypes = {
  personNode: PersonNode,
  coupleNode: CoupleNode,
};

interface TreeViewProps {
  persons: PersonData[];
  relationships: RelationshipData[];
  marriages: MarriageData[];
  onPersonSelect: (person: PersonData | null) => void;
}

export default function TreeView({
  persons,
  relationships,
  marriages,
  onPersonSelect,
}: TreeViewProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildTreeLayout(persons, relationships, marriages),
    [persons, relationships, marriages]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls className="!border-slate-200 !shadow-sm" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "coupleNode") return "#e2e8f0";
            const person = node.data as unknown as PersonData;
            if (person?.jenis_kelamin === "LAKI_LAKI") return "#bfdbfe";
            return "#fce7f3";
          }}
          className="!border-slate-200 !shadow-sm"
          style={{ width: 120, height: 80 }}
        />
      </ReactFlow>
    </div>
  );
}
