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
      <header className="h-14 border-b border-slate-200 bg-white flex items-center px-5 gap-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-2 mr-4">
          <span className="text-lg">🌳</span>
          <span className="font-semibold text-slate-800 text-sm">Silsilah Keluarga</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
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

        <div className="ml-auto">
          <span className="text-xs text-slate-400">{persons.length} anggota</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        <TreeView
          persons={persons}
          relationships={relationships}
          marriages={marriages}
          onPersonSelect={handlePersonSelect}
        />

        {/* Slide-in detail panel */}
        <div
          className={`
            absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl
            transition-transform duration-300 ease-in-out z-10
            ${selectedPerson ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <Sidebar person={selectedPerson} allPersons={persons} onClose={() => handlePersonSelect(null)} />
        </div>
      </div>
    </div>
  );
}
