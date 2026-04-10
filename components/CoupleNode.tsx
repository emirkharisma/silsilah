"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";

export default function CoupleNode({ data }: NodeProps) {
  const { status, eitherDeceased } = data as { status: string; eitherDeceased: boolean };

  const heartColor =
    status === "CERAI"
      ? "text-orange-400"
      : eitherDeceased
      ? "text-slate-400"
      : "text-rose-400";

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <Handle type="target" id="left" position={Position.Left} style={{ visibility: "hidden" }} />
      <Handle type="target" id="right" position={Position.Right} style={{ visibility: "hidden" }} />
      <span className={`text-sm leading-none select-none ${heartColor}`}>♥</span>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </div>
  );
}
