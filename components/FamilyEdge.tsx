"use client";

import { EdgeProps } from "@xyflow/react";

export default function FamilyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
}: EdgeProps) {
  const bendY = targetY - 30;
  const d = `M ${sourceX} ${sourceY} L ${sourceX} ${bendY} L ${targetX} ${bendY} L ${targetX} ${targetY}`;

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={d}
      fill="none"
      style={style}
    />
  );
}
