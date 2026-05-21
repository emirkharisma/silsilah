"use client";

import { useState, useCallback, useDeferredValue, useMemo } from "react";
import dynamic from "next/dynamic";
import Sidebar from "./Sidebar";
import { PersonData, RelationshipData, MarriageData } from "@/lib/tree-layout";

// Dynamically import TreeView to avoid SSR issues with React Flow
const TreeView = dynamic(() => import("./TreeView"), { ssr: false });

interface TreePageProps {
  persons: PersonData[];
  relationships: RelationshipData[];
  marriages: MarriageData[];
}

export default function TreePage({ persons, relationships, marriages }: TreePageProps) {
  const [selectedPerson, setSelectedPerson] = useState<PersonData | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  // Compute the set of node IDs that should stay fully visible when a person is selected.
  // Includes: the person themselves, their spouse(s), their children, their parents,
  // and the couple-dot nodes that connect those relationships.
  const highlightSet = useMemo((): Set<string> | null => {
    if (!selectedPerson) return null;
    const id = selectedPerson.id;
    const ids = new Set<string>([id]);

    // Spouse(s) + couple node
    for (const m of marriages) {
      if (m.person_a_id === id || m.person_b_id === id) {
        ids.add(m.person_a_id === id ? m.person_b_id : m.person_a_id);
        ids.add(`couple-${m.id}`);
      }
    }

    // Children (selected person is the parent in the relationship)
    for (const r of relationships) {
      if (r.related_id === id) ids.add(r.person_id);
    }

    // Parents (selected person is the child in the relationship)
    const parentIds = new Set<string>();
    for (const r of relationships) {
      if (r.person_id === id) {
        ids.add(r.related_id);
        parentIds.add(r.related_id);
      }
    }

    // Parent couple node(s)
    for (const m of marriages) {
      if (parentIds.has(m.person_a_id) || parentIds.has(m.person_b_id)) {
        ids.add(`couple-${m.id}`);
      }
    }

    return ids;
  }, [selectedPerson, marriages, relationships]);

  const searchResults = useMemo(() => {
    if (!deferredSearch.trim()) return [];
    const q = deferredSearch.toLowerCase();
    return persons
      .filter(
        (p) =>
          p.nama_lengkap.toLowerCase().includes(q) ||
          (p.nama_panggilan?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8);
  }, [deferredSearch, persons]);

  const handlePersonSelect = useCallback((person: PersonData | null) => {
    setSelectedPerson(person);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Topbar */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 md:px-5 gap-3 md:gap-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-800 text-sm tracking-tight hidden sm:block">Silsilah Keluarga</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs md:max-w-sm">
          <input
            type="text"
            placeholder="Cari anggota keluarga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 pl-8 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50"
          />
          <svg
            className="absolute left-2.5 top-2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => {
                    setSelectedPerson(p);
                    setSearch("");
                  }}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
                      p.jenis_kelamin === "LAKI_LAKI"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-pink-100 text-pink-700"
                    }`}
                  >
                    {p.nama_lengkap[0]}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {p.nama_panggilan || p.nama_lengkap.split(" ")[0]}
                    </p>
                    <p className="text-[10px] text-slate-400">{p.nama_lengkap}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex-shrink-0">
          <span className="text-xs text-slate-400 hidden sm:block">{persons.length} anggota</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        <TreeView
          persons={persons}
          relationships={relationships}
          marriages={marriages}
          onPersonSelect={handlePersonSelect}
          selectedPersonId={selectedPerson?.id}
          highlightSet={highlightSet}
        />

        {/* ── Desktop: right slide-in panel (md+) ── */}
        <div
          className={`
            hidden md:block
            absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl
            transition-transform duration-300 ease-in-out z-10
            ${selectedPerson ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <Sidebar person={selectedPerson} allPersons={persons} onClose={() => handlePersonSelect(null)} />
        </div>

        {/* ── Mobile: bottom sheet (<md) ── */}
        {/* Backdrop */}
        <div
          className={`
            md:hidden absolute inset-0 bg-black/30 z-10
            transition-opacity duration-300
            ${selectedPerson ? "opacity-100" : "opacity-0 pointer-events-none"}
          `}
          onClick={() => handlePersonSelect(null)}
        />
        {/* Sheet */}
        <div
          className={`
            md:hidden absolute bottom-0 left-0 right-0 z-20
            bg-white rounded-t-3xl shadow-2xl overflow-hidden
            flex flex-col
            transition-transform duration-300 ease-in-out
            max-h-[78vh]
            ${selectedPerson ? "translate-y-0" : "translate-y-full"}
          `}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
          {/* Scrollable content */}
          <div className="flex-1 min-h-0">
            <Sidebar person={selectedPerson} allPersons={persons} onClose={() => handlePersonSelect(null)} />
          </div>
        </div>
      </div>
    </div>
  );
}
