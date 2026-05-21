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
// On desktop (md+) the right sidebar is 320px wide, so we shift the target
// left by half that width (in flow coords) so the node lands in the middle
// of the remaining canvas area.
const SIDEBAR_W = 320; // matches w-80 in TreePage

function AutoCenter({ selectedPersonId, nodes }: { selectedPersonId?: string; nodes: Node[] }) {
  const { setCenter, getZoom } = useReactFlow();

  useEffect(() => {
    if (!selectedPersonId) return;
    const node = nodes.find((n) => n.id === selectedPersonId);
    if (!node) return;

    const zoom = Math.max(getZoom(), 0.8);
    // PersonNode is w-44 (176px) wide; height ~88px
    let cx = node.position.x + 88;
    let cy = node.position.y + 44;

    if (typeof window !== "undefined") {
      if (window.innerWidth >= 768) {
        // Desktop: sidebar covers right 320px.
        // Add 160/zoom so node lands at centre of visible canvas (left of sidebar).
        cx += SIDEBAR_W / 2 / zoom;
      } else {
        // Mobile: bottom sheet covers ~78vh from the bottom.
        // Visible canvas = top 22% of viewport. Its centre = 11% from top.
        // setCenter puts the flow point at viewport centre (50% from top).
        // Shift cy UP so node appears at the visible-area centre:
        //   offset = (50% − 11%) × viewportHeight / zoom
        // Target node at ~18% from top — sits clearly above the bottom sheet
        cy += (0.5 - 0.18) * window.innerHeight / zoom;
      }
    }

    setCenter(cx, cy, { zoom, duration: 500 });
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

  // Constrain panning so the user can't scroll far from the tree content
  const translateExtent = useMemo((): [[number, number], [number, number]] => {
    if (nodes.length === 0) return [[-400, -400], [400, 400]];
    const pad = 400; // breathing room around the tree
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    return [
      [Math.min(...xs) - pad,       Math.min(...ys) - pad],
      [Math.max(...xs) + 300 + pad, Math.max(...ys) + 120 + pad], // +300/+120 = node w/h
    ];
  }, [nodes]);

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
        // Figma-style navigation:
        // two-finger scroll → pan, pinch → zoom, drag → pan
        panOnScroll
        panOnScrollMode={"free" as never}
        zoomOnScroll={false}
        zoomOnPinch
        panOnDrag
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        translateExtent={translateExtent}
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
