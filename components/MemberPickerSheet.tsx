"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { PersonData } from "@/lib/tree-layout";

interface Props {
  persons: PersonData[];
  excludeId?: string;
  selectedId?: string;
  onSelect: (person: PersonData) => void;
  onBack: () => void;
  onClose: () => void;
}

function getInitials(p: PersonData) {
  return p.nama_lengkap.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function MemberPickerSheet({ persons, excludeId, selectedId, onSelect, onBack, onClose }: Props) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const options = useMemo(() => {
    const others = persons.filter((p) => p.id !== excludeId);
    const q = search.toLowerCase().trim();
    if (!q) return others;
    return others.filter(
      (p) =>
        p.nama_lengkap.toLowerCase().includes(q) ||
        (p.nama_panggilan?.toLowerCase().includes(q) ?? false)
    );
  }, [persons, excludeId, search]);

  return (
    <>
      {/* Header + search — sticky inside parent scroll container */}
      <div className="sticky top-0 bg-white z-10 border-b border-slate-100">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="Kembali"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="flex-1 text-center font-semibold text-slate-800">Pilih Anggota</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="Tutup"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 rounded-xl">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List — flows naturally, parent handles scroll */}
      <div className="pb-10">
        {options.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Tidak ditemukan</p>
        ) : (
          options.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                p.id === selectedId ? "bg-indigo-50" : "active:bg-slate-50"
              }`}
            >
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  p.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                }`}
              >
                {getInitials(p)}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`font-medium block truncate text-sm ${p.id === selectedId ? "text-indigo-700" : "text-slate-800"}`}>
                  {p.nama_panggilan || p.nama_lengkap.split(" ")[0]}
                </span>
                <span className="text-xs text-slate-400 block truncate">{p.nama_lengkap}</span>
              </span>
              {p.id === selectedId && (
                <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))
        )}
      </div>
    </>
  );
}
