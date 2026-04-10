"use client";

import { useEffect, useState } from "react";
import { PersonData } from "@/lib/tree-layout";

interface SidebarProps {
  person: PersonData | null;
  allPersons: PersonData[];
  onClose: () => void;
}

interface RelationResult {
  relation: string;
}

export default function Sidebar({ person, allPersons, onClose }: SidebarProps) {
  const [compareId, setCompareId] = useState<string>("");
  const [relation, setRelation] = useState<RelationResult | null>(null);
  const [loadingRelation, setLoadingRelation] = useState(false);

  useEffect(() => {
    setCompareId("");
    setRelation(null);
  }, [person]);

  useEffect(() => {
    if (!person || !compareId) {
      setRelation(null);
      return;
    }
    setLoadingRelation(true);
    fetch(`/api/relation?a=${person.id}&b=${compareId}`)
      .then((r) => r.json())
      .then((data) => setRelation(data))
      .catch(() => setRelation(null))
      .finally(() => setLoadingRelation(false));
  }, [person, compareId]);

  if (!person) return null;

  const initials = person.nama_lengkap
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const others = allPersons.filter((p) => p.id !== person.id);

  return (
    <aside className="flex flex-col overflow-y-auto h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={onClose}
          className="float-right text-slate-400 hover:text-slate-700 text-lg leading-none"
          aria-label="Tutup"
        >
          ×
        </button>
        <div className="flex items-center gap-3 mb-3">
          {person.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.foto_url}
              alt={person.nama_lengkap}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                person.jenis_kelamin === "LAKI_LAKI"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-pink-100 text-pink-700"
              }`}
            >
              {initials}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="font-semibold text-slate-800 truncate">
              {person.nama_panggilan || person.nama_lengkap.split(" ")[0]}
            </p>
            <p className="text-xs text-slate-500 truncate">{person.nama_lengkap}</p>
            {person.is_deceased && (
              <span className="text-[10px] text-slate-400 italic">almarhum/ah</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              person.jenis_kelamin === "LAKI_LAKI"
                ? "bg-blue-100 text-blue-700"
                : "bg-pink-100 text-pink-700"
            }`}
          >
            {person.jenis_kelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
          </span>
          {person.urutan_lahir && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              Anak ke-{person.urutan_lahir}
            </span>
          )}
          {person.is_deceased && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              Almarhum/ah
            </span>
          )}
        </div>
      </div>

      {/* Relation checker */}
      <div className="p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Cek Hubungan Kekerabatan
        </p>
        <select
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={compareId}
          onChange={(e) => setCompareId(e.target.value)}
        >
          <option value="">Pilih anggota lain...</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_panggilan || p.nama_lengkap.split(" ")[0]} — {p.nama_lengkap}
            </option>
          ))}
        </select>

        {compareId && (
          <div className="mt-3 p-3 rounded-lg bg-slate-50 text-sm text-slate-700">
            {loadingRelation ? (
              <span className="text-slate-400">Menghitung...</span>
            ) : relation ? (
              <>
                <span className="font-medium text-indigo-700">
                  {allPersons.find((p) => p.id === compareId)?.nama_panggilan ||
                    allPersons.find((p) => p.id === compareId)?.nama_lengkap.split(" ")[0]}
                </span>
                <span className="text-slate-500"> adalah </span>
                <span className="font-medium text-slate-800">{relation.relation}</span>
                <span className="text-slate-500"> dari </span>
                <span className="font-medium text-indigo-700">{person.nama_panggilan || person.nama_lengkap.split(" ")[0]}</span>
              </>
            ) : (
              <span className="text-slate-400">Hubungan tidak ditemukan</span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
