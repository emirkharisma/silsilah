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
  // If source and target are horizontally aligned (single child), draw a straight vertical line
  const isStraight = Math.abs(sourceX - targetX) < 2;
  const bendY = targetY - 30;
  const d = isStraight
    ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    : `M ${sourceX} ${sourceY} L ${sourceX} ${bendY} L ${targetX} ${bendY} L ${targetX} ${targetY}`;

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
