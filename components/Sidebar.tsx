"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { PersonData } from "@/lib/tree-layout";

interface SidebarProps {
  person: PersonData | null;
  allPersons: PersonData[];
  onClose: () => void;
  // Mobile picker — controlled from TreePage
  comparePersonId?: string;
  onOpenPicker?: () => void;
}

interface RelationResult {
  relation: string;
}

function getInitials(p: PersonData) {
  return p.nama_lengkap.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function Sidebar({ person, allPersons, onClose, comparePersonId: externalCompareId, onOpenPicker }: SidebarProps) {
  // On desktop: internal dropdown state. On mobile: controlled externally via props.
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [internalCompareId, setInternalCompareId] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);

  const [relation, setRelation] = useState<RelationResult | null>(null);
  const [loadingRelation, setLoadingRelation] = useState(false);

  // Use external compareId on mobile (when onOpenPicker is provided), else internal
  const compareId = onOpenPicker ? (externalCompareId ?? "") : internalCompareId;
  const setCompareId = (id: string) => { if (!onOpenPicker) setInternalCompareId(id); };

  // Reset on person change
  useEffect(() => {
    setInternalCompareId("");
    setRelation(null);
    setDropdownOpen(false);
    setDropdownSearch("");
  }, [person]);

  // Fetch relation
  useEffect(() => {
    if (!person || !compareId) { setRelation(null); return; }
    setLoadingRelation(true);
    fetch(`/api/relation?a=${person.id}&b=${compareId}`)
      .then((r) => r.json())
      .then((data) => setRelation(data))
      .catch(() => setRelation(null))
      .finally(() => setLoadingRelation(false));
  }, [person, compareId]);

  // Desktop: close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setDropdownSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Desktop: focus search on open
  useEffect(() => {
    if (dropdownOpen) setTimeout(() => desktopSearchRef.current?.focus(), 50);
  }, [dropdownOpen]);

  const others = useMemo(() => allPersons.filter((p) => p.id !== person?.id), [allPersons, person]);

  const desktopFiltered = useMemo(() => {
    const q = dropdownSearch.toLowerCase().trim();
    if (!q) return others;
    return others.filter(
      (p) =>
        p.nama_lengkap.toLowerCase().includes(q) ||
        (p.nama_panggilan?.toLowerCase().includes(q) ?? false)
    );
  }, [others, dropdownSearch]);

  const selectedPerson2 = allPersons.find((p) => p.id === compareId && p.id !== person?.id);

  if (!person) return null;

  const initials = getInitials(person);
  const isMobile = !!onOpenPicker;

  const handleTriggerClick = () => {
    if (isMobile) {
      onOpenPicker!();
    } else {
      setDropdownOpen((v) => !v);
      setDropdownSearch("");
    }
  };

  const isMale = person.jenis_kelamin === "LAKI_LAKI";

  return (
    <aside className="flex flex-col">
      {/* ── Hero photo banner ── */}
      <div className="relative flex-shrink-0">
        {/* Photo or gradient placeholder */}
        <div className={`w-full aspect-[4/3] md:aspect-square overflow-hidden ${person.foto_url ? "" : isMale ? "bg-gradient-to-br from-blue-100 to-blue-200" : "bg-gradient-to-br from-pink-100 to-pink-200"}`}>
          {person.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.foto_url}
              alt={person.nama_lengkap}
              className={`w-full h-full object-cover ${person.is_deceased ? "grayscale opacity-80" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className={`text-6xl font-bold ${isMale ? "text-blue-300" : "text-pink-300"}`}>
                {initials}
              </span>
            </div>
          )}
          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm"
          aria-label="Tutup"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Name overlaid on gradient */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <p className="font-bold text-lg text-white leading-tight truncate drop-shadow">
            {person.nama_panggilan || person.nama_lengkap.split(" ")[0]}
          </p>
          <p className="text-xs text-white/75 truncate drop-shadow">{person.nama_lengkap}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="px-5 pt-3 pb-3 border-b border-slate-100 flex gap-2 flex-wrap flex-shrink-0">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isMale ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
          {isMale ? "Laki-laki" : "Perempuan"}
        </span>
        {person.urutan_lahir && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            Anak ke-{person.urutan_lahir}
          </span>
        )}
        {person.is_deceased && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
            {isMale ? "Almarhum" : "Almarhumah"}
          </span>
        )}
      </div>

      {/* Catatan */}
      {person.catatan && (
        <div className="px-5 pt-4 pb-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Catatan</p>
          <p className="text-sm text-slate-600 leading-relaxed">{person.catatan}</p>
        </div>
      )}

      {/* Relation checker */}
      <div className="p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Cek Hubungan Kekerabatan
        </p>

        {/* Trigger button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleTriggerClick}
            className={`
              w-full flex items-center justify-between gap-2
              text-sm border rounded-xl px-3 py-2.5 bg-white
              transition-all duration-150 text-left
              ${dropdownOpen ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"}
            `}
          >
            {selectedPerson2 ? (
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${selectedPerson2.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                  {getInitials(selectedPerson2)}
                </span>
                <span className="font-medium text-slate-800 truncate">
                  {selectedPerson2.nama_panggilan || selectedPerson2.nama_lengkap.split(" ")[0]}
                </span>
                <span className="text-slate-400 truncate text-xs hidden sm:block">
                  {selectedPerson2.nama_lengkap}
                </span>
              </span>
            ) : (
              <span className="text-slate-400">Pilih anggota lain...</span>
            )}
            <svg
              className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Desktop-only dropdown panel */}
          {dropdownOpen && !isMobile && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={desktopSearchRef}
                    type="text"
                    placeholder="Cari nama..."
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                  />
                  {dropdownSearch && (
                    <button onClick={() => setDropdownSearch("")} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto overscroll-contain">
                {desktopFiltered.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Tidak ditemukan</p>
                ) : (
                  desktopFiltered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setCompareId(p.id); setDropdownOpen(false); setDropdownSearch(""); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${p.id === compareId ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${p.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                        {getInitials(p)}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium block truncate">{p.nama_panggilan || p.nama_lengkap.split(" ")[0]}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{p.nama_lengkap}</span>
                      </span>
                      {p.id === compareId && (
                        <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Relation result */}
        {compareId && (
          <div className="mt-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-slate-700">
            {loadingRelation ? (
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span>Menghitung...</span>
              </div>
            ) : relation ? (
              <p className="leading-relaxed">
                <span className="font-semibold text-indigo-700">
                  {selectedPerson2?.nama_panggilan || selectedPerson2?.nama_lengkap.split(" ")[0]}
                </span>
                <span className="text-slate-500"> adalah </span>
                <span className="font-semibold text-slate-800">{relation.relation}</span>
                <span className="text-slate-500"> dari </span>
                <span className="font-semibold text-indigo-700">{person.nama_panggilan || person.nama_lengkap.split(" ")[0]}</span>
              </p>
            ) : (
              <span className="text-slate-400">Hubungan tidak ditemukan</span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
