"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { PersonData } from "@/lib/tree-layout";

export default function PersonNode({ data, selected }: NodeProps) {
  const person = data as unknown as PersonData;

  const initials = person.nama_lengkap
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`
        w-40 rounded-xl border-2 bg-white shadow-sm transition-all
        ${selected ? "border-indigo-500 shadow-indigo-100 shadow-md" : "border-slate-200"}
        ${person.is_deceased ? "opacity-50" : ""}
      `}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
      <Handle type="source" id="right" position={Position.Right} style={{ visibility: "hidden" }} />
      <Handle type="source" id="left" position={Position.Left} style={{ visibility: "hidden" }} />

      <div className="flex items-center gap-2 p-2">
        {person.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.foto_url}
            alt={person.nama_lengkap}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0
            ${person.jenis_kelamin === "LAKI_LAKI"
              ? "bg-blue-100 text-blue-700"
              : "bg-pink-100 text-pink-700"
            }
          `}>
            {initials}
          </div>
        )}

        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
            {person.nama_panggilan || person.nama_lengkap.split(" ")[0]}
          </p>
          <p className="text-[10px] text-slate-400 truncate leading-tight">
            {person.nama_lengkap}
          </p>
          {person.is_deceased && (
            <p className="text-[9px] text-slate-400 italic">almarhum/ah</p>
          )}
        </div>
      </div>

    </div>
  );
}
