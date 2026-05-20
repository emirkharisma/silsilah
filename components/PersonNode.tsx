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

  const isMale = person.jenis_kelamin === "LAKI_LAKI";

  return (
    <div
      className={`
        group w-44 rounded-2xl border bg-white
        transition-all duration-150 cursor-pointer
        ${selected
          ? "border-indigo-400 shadow-lg shadow-indigo-100 ring-2 ring-indigo-300 scale-[1.03]"
          : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:scale-[1.02]"
        }
        ${person.is_deceased ? "border-dashed" : ""}
      `}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
      <Handle type="source" id="right" position={Position.Right} style={{ visibility: "hidden" }} />
      <Handle type="source" id="left" position={Position.Left} style={{ visibility: "hidden" }} />

      <div className="flex items-center gap-2.5 p-2.5">
        {/* Avatar */}
        {person.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.foto_url}
            alt={person.nama_lengkap}
            className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${person.is_deceased ? "grayscale opacity-60" : ""}`}
          />
        ) : (
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0
            ${isMale ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}
            ${person.is_deceased ? "opacity-50" : ""}
          `}>
            {initials}
          </div>
        )}

        {/* Text */}
        <div className="overflow-hidden min-w-0">
          <p className={`text-[13px] font-semibold truncate leading-tight ${person.is_deceased ? "text-slate-400" : "text-slate-800"}`}>
            {person.nama_panggilan || person.nama_lengkap.split(" ")[0]}
          </p>
          <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
            {person.nama_lengkap}
          </p>
          {person.is_deceased && (
            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
              <span>†</span>
              <span>Almarhum/ah</span>
            </p>
          )}
        </div>
      </div>

      {/* Gender accent bar at bottom */}
      <div className={`
        h-0.5 rounded-b-2xl mx-2.5 mb-2
        ${selected
          ? "bg-indigo-400"
          : isMale ? "bg-blue-200" : "bg-pink-200"
        }
        ${person.is_deceased ? "opacity-40" : ""}
      `} />
    </div>
  );
}
