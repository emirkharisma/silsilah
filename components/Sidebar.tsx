"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { PersonData } from "@/lib/tree-layout";

interface SidebarProps {
  person: PersonData | null;
  allPersons: PersonData[];
  onClose: () => void;
}

interface RelationResult {
  relation: string;
}

function getInitials(p: PersonData) {
  return p.nama_lengkap
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Sidebar({ person, allPersons, onClose }: SidebarProps) {
  const [compareId, setCompareId] = useState<string>("");
  const [relation, setRelation] = useState<RelationResult | null>(null);
  const [loadingRelation, setLoadingRelation] = useState(false);

  // Shared open/search state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");

  // Desktop dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  // Mobile sheet
  const mobileSearchRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
  const [sheetAnimIn, setSheetAnimIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset on person change
  useEffect(() => {
    setCompareId("");
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

  // Desktop: close on outside click
  useEffect(() => {
    if (!dropdownOpen || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setDropdownSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen, isMobile]);

  // Desktop: focus search on open
  useEffect(() => {
    if (dropdownOpen && !isMobile) {
      setTimeout(() => desktopSearchRef.current?.focus(), 50);
    }
  }, [dropdownOpen, isMobile]);

  // Mobile sheet: animate in/out
  useEffect(() => {
    if (dropdownOpen && isMobile) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetAnimIn(true));
      });
    } else {
      setSheetAnimIn(false);
    }
  }, [dropdownOpen, isMobile]);

  // Mobile sheet: focus search after animation
  useEffect(() => {
    if (sheetAnimIn) {
      setTimeout(() => mobileSearchRef.current?.focus(), 200);
    }
  }, [sheetAnimIn]);

  const closeSheet = useCallback(() => {
    setSheetAnimIn(false);
    setTimeout(() => {
      setDropdownOpen(false);
      setDropdownSearch("");
    }, 300);
  }, []);

  const handleOpen = () => {
    setDropdownOpen((v) => !v);
    setDropdownSearch("");
  };

  const selectPerson = useCallback((id: string) => {
    setCompareId(id);
    setDropdownOpen(false);
    setDropdownSearch("");
    setSheetAnimIn(false);
  }, []);

  const others = useMemo(
    () => allPersons.filter((p) => p.id !== person?.id),
    [allPersons, person]
  );

  const filteredOptions = useMemo(() => {
    const q = dropdownSearch.toLowerCase().trim();
    if (!q) return others;
    return others.filter(
      (p) =>
        p.nama_lengkap.toLowerCase().includes(q) ||
        (p.nama_panggilan?.toLowerCase().includes(q) ?? false)
    );
  }, [others, dropdownSearch]);

  const selectedPerson2 = others.find((p) => p.id === compareId);

  if (!person) return null;

  const initials = getInitials(person);

  // ── Option row (shared between desktop dropdown & mobile sheet) ──
  const OptionRow = ({ p }: { p: PersonData }) => (
    <button
      key={p.id}
      type="button"
      onClick={() => selectPerson(p.id)}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors
        ${p.id === compareId ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}
      `}
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
          p.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
        }`}
      >
        {getInitials(p)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-medium block truncate">
          {p.nama_panggilan || p.nama_lengkap.split(" ")[0]}
        </span>
        <span className="text-[11px] text-slate-400 block truncate">{p.nama_lengkap}</span>
      </span>
      {p.id === compareId && (
        <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );

  // ── Search bar (shared) ──
  const SearchBar = ({ inputRef }: { inputRef: React.RefObject<HTMLInputElement> }) => (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
      <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
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
  );

  return (
    <aside className="flex flex-col overflow-y-auto h-full overscroll-contain">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={onClose}
          className="float-right w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Tutup"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
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
              <span className="text-[10px] text-slate-400 italic">
                {person.jenis_kelamin === "LAKI_LAKI" ? "almarhum" : "almarhumah"}
              </span>
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
              {person.jenis_kelamin === "LAKI_LAKI" ? "Almarhum" : "Almarhumah"}
            </span>
          )}
        </div>
      </div>

      {/* Catatan */}
      {person.catatan && (
        <div className="px-5 pt-4 pb-0 flex-shrink-0">
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
            onClick={handleOpen}
            className={`
              w-full flex items-center justify-between gap-2
              text-sm border rounded-xl px-3 py-2.5 bg-white
              transition-all duration-150 text-left
              ${dropdownOpen && !isMobile
                ? "border-indigo-400 ring-2 ring-indigo-100"
                : "border-slate-200 hover:border-slate-300"
              }
            `}
          >
            {selectedPerson2 ? (
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
                    selectedPerson2.jenis_kelamin === "LAKI_LAKI"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-pink-100 text-pink-700"
                  }`}
                >
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
              className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-150 ${dropdownOpen && !isMobile ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ── Desktop dropdown panel ── */}
          {dropdownOpen && !isMobile && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <SearchBar inputRef={desktopSearchRef} />
              </div>
              <div className="max-h-52 overflow-y-auto overscroll-contain">
                {filteredOptions.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Tidak ditemukan</p>
                ) : (
                  filteredOptions.map((p) => <OptionRow key={p.id} p={p} />)
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile bottom sheet via portal ── */}
        {mounted && isMobile && dropdownOpen && createPortal(
          <>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/40 z-[200] transition-opacity duration-300 ${sheetAnimIn ? "opacity-100" : "opacity-0"}`}
              onClick={closeSheet}
            />
            {/* Sheet */}
            <div
              className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out"
              style={{ maxHeight: "72vh", transform: sheetAnimIn ? "translateY(0)" : "translateY(100%)" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              {/* Title + close */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
                <p className="font-semibold text-slate-800">Pilih Anggota</p>
                <button
                  onClick={closeSheet}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pb-3 flex-shrink-0">
                <SearchBar inputRef={mobileSearchRef} />
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
                {filteredOptions.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Tidak ditemukan</p>
                ) : (
                  filteredOptions.map((p) => <OptionRow key={p.id} p={p} />)
                )}
              </div>
            </div>
          </>,
          document.body
        )}

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
