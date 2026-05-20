"use client";

import { useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import { Person, Relationship, Marriage, JenisKelamin, StatusPernikahan } from "@prisma/client";

interface AdminPanelProps {
  initialPersons: Person[];
  initialRelationships: Relationship[];
  initialMarriages: Marriage[];
}

type FormState = {
  nama_lengkap: string;
  nama_panggilan: string;
  jenis_kelamin: JenisKelamin;
  is_deceased: boolean;
  urutan_lahir: string;
  catatan: string;
  foto_url: string;
  ayah_id: string;
  ibu_id: string;
  pasangan_id: string;
  status_nikah: StatusPernikahan;
};

const emptyForm = (): FormState => ({
  nama_lengkap: "",
  nama_panggilan: "",
  jenis_kelamin: "LAKI_LAKI",
  is_deceased: false,
  urutan_lahir: "",
  catatan: "",
  foto_url: "",
  ayah_id: "",
  ibu_id: "",
  pasangan_id: "",
  status_nikah: "AKTIF",
});

type FilterGender = "ALL" | "LAKI_LAKI" | "PEREMPUAN";
type FilterStatus = "ALL" | "ALIVE" | "DECEASED";

export default function AdminPanel({ initialPersons, initialRelationships, initialMarriages }: AdminPanelProps) {
  const [persons, setPersons] = useState(initialPersons);
  const [relationships, setRelationships] = useState(initialRelationships);
  const [marriages, setMarriages] = useState(initialMarriages);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<FilterGender>("ALL");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  // ── helpers ──────────────────────────────────────────────────────────
  const getName = (id: string) => {
    const p = persons.find((x) => x.id === id);
    return p ? (p.nama_panggilan || p.nama_lengkap.split(" ")[0]) : "–";
  };

  const getAyah = (personId: string) =>
    relationships.find((r) => r.person_id === personId && r.tipe === "AYAH_KANDUNG")?.related_id ?? "";

  const getIbu = (personId: string) =>
    relationships.find((r) => r.person_id === personId && r.tipe === "IBU_KANDUNG")?.related_id ?? "";

  const getMarriage = (personId: string): Marriage | null =>
    marriages.find((m) => m.person_a_id === personId || m.person_b_id === personId) ?? null;

  const getSpouseId = (personId: string): string => {
    const m = getMarriage(personId);
    if (!m) return "";
    return m.person_a_id === personId ? m.person_b_id : m.person_a_id;
  };

  // ── filtered list ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return persons.filter((p) => {
      if (q && !p.nama_lengkap.toLowerCase().includes(q) && !(p.nama_panggilan?.toLowerCase().includes(q))) return false;
      if (filterGender !== "ALL" && p.jenis_kelamin !== filterGender) return false;
      if (filterStatus === "ALIVE" && p.is_deceased) return false;
      if (filterStatus === "DECEASED" && !p.is_deceased) return false;
      return true;
    });
  }, [persons, search, filterGender, filterStatus]);

  // ── stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: persons.length,
    laki: persons.filter((p) => p.jenis_kelamin === "LAKI_LAKI").length,
    perempuan: persons.filter((p) => p.jenis_kelamin === "PEREMPUAN").length,
    almarhum: persons.filter((p) => p.is_deceased).length,
  }), [persons]);

  // ── open panel ───────────────────────────────────────────────────────
  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setPanelOpen(true);
  }

  function openEdit(p: Person) {
    setEditingId(p.id);
    setForm({
      nama_lengkap: p.nama_lengkap,
      nama_panggilan: p.nama_panggilan ?? "",
      jenis_kelamin: p.jenis_kelamin,
      is_deceased: p.is_deceased,
      urutan_lahir: p.urutan_lahir?.toString() ?? "",
      catatan: p.catatan ?? "",
      foto_url: p.foto_url ?? "",
      ayah_id: getAyah(p.id),
      ibu_id: getIbu(p.id),
      pasangan_id: getSpouseId(p.id),
      status_nikah: getMarriage(p.id)?.status ?? "AKTIF",
    });
    setPanelOpen(true);
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      set("foto_url", url);
    } catch (e) {
      alert("Gagal upload foto: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  // ── save ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.nama_lengkap.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/persons/${editingId}` : "/api/persons";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_lengkap: form.nama_lengkap,
          nama_panggilan: form.nama_panggilan || null,
          jenis_kelamin: form.jenis_kelamin,
          is_deceased: form.is_deceased,
          urutan_lahir: form.urutan_lahir ? Number(form.urutan_lahir) : null,
          catatan: form.catatan || null,
          foto_url: form.foto_url || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Person = await res.json();
      const personId = saved.id;

      if (editingId) {
        const oldRels = relationships.filter(
          (r) => r.person_id === personId && (r.tipe === "AYAH_KANDUNG" || r.tipe === "IBU_KANDUNG")
        );
        for (const r of oldRels) await fetch(`/api/relationships/${r.id}`, { method: "DELETE" });
        setRelationships((prev) =>
          prev.filter((r) => !(r.person_id === personId && (r.tipe === "AYAH_KANDUNG" || r.tipe === "IBU_KANDUNG")))
        );
      }

      const newRels: Relationship[] = [];
      if (form.ayah_id) {
        const r = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: personId, related_id: form.ayah_id, tipe: "AYAH_KANDUNG" }),
        });
        if (r.ok) newRels.push(await r.json());
      }
      if (form.ibu_id) {
        const r = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: personId, related_id: form.ibu_id, tipe: "IBU_KANDUNG" }),
        });
        if (r.ok) newRels.push(await r.json());
      }

      if (editingId) {
        const oldMar = getMarriage(personId);
        if (oldMar) {
          await fetch(`/api/marriages/${oldMar.id}`, { method: "DELETE" });
          setMarriages((prev) => prev.filter((m) => m.id !== oldMar.id));
        }
      }
      let newMar: Marriage | null = null;
      if (form.pasangan_id) {
        const r = await fetch("/api/marriages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_a_id: personId, person_b_id: form.pasangan_id, status: form.status_nikah }),
        });
        if (r.ok) newMar = await r.json();
      }

      setPersons((prev) => editingId ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]);
      setRelationships((prev) => [...prev, ...newRels]);
      if (newMar) setMarriages((prev) => [...prev, newMar!]);

      closePanel();
    } catch (e) {
      alert("Error: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus anggota ini beserta semua relasi dan pernikahannya?")) return;
    const res = await fetch(`/api/persons/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("Gagal menghapus"); return; }
    setPersons((prev) => prev.filter((p) => p.id !== id));
    setRelationships((prev) => prev.filter((r) => r.person_id !== id && r.related_id !== id));
    setMarriages((prev) => prev.filter((m) => m.person_a_id !== id && m.person_b_id !== id));
    if (editingId === id) closePanel();
  }

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const otherPersons = persons.filter((p) => p.id !== editingId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-3 sticky top-0 z-20">
        <a href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Pohon Keluarga
        </a>
        <span className="text-slate-200">|</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="font-semibold text-slate-800 text-sm">Admin Panel</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Anggota
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-lg transition-colors hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Anggota", value: stats.total, color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
            { label: "Laki-laki", value: stats.laki, color: "bg-blue-50 text-blue-700 border-blue-100" },
            { label: "Perempuan", value: stats.perempuan, color: "bg-pink-50 text-pink-700 border-pink-100" },
            { label: "Almarhum/ah", value: stats.almarhum, color: "bg-slate-50 text-slate-600 border-slate-200" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-75 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search & filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama anggota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Gender filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {(["ALL", "LAKI_LAKI", "PEREMPUAN"] as FilterGender[]).map((v) => (
              <button
                key={v}
                onClick={() => setFilterGender(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterGender === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {v === "ALL" ? "Semua" : v === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {(["ALL", "ALIVE", "DECEASED"] as FilterStatus[]).map((v) => (
              <button
                key={v}
                onClick={() => setFilterStatus(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterStatus === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {v === "ALL" ? "Semua" : v === "ALIVE" ? "Masih hidup" : "Almarhum"}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} dari {persons.length} anggota
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kelamin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Orang Tua</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pasangan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p, i) => {
                const ayahId = getAyah(p.id);
                const ibuId = getIbu(p.id);
                const spouseId = getSpouseId(p.id);
                const marriage = getMarriage(p.id);
                const isMale = p.jenis_kelamin === "LAKI_LAKI";
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    {/* Index */}
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {p.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.foto_url} alt={p.nama_lengkap} className={`w-8 h-8 rounded-full object-cover flex-shrink-0 ${p.is_deceased ? "grayscale opacity-60" : ""}`} />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isMale ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}>
                            {p.nama_lengkap[0]}
                          </div>
                        )}
                        <div>
                          <p className={`font-medium leading-tight ${p.is_deceased ? "text-slate-400" : "text-slate-800"}`}>
                            {p.nama_panggilan || p.nama_lengkap.split(" ")[0]}
                            {p.is_deceased && <span className="ml-1 text-slate-400">†</span>}
                          </p>
                          <p className="text-xs text-slate-400 leading-tight">{p.nama_lengkap}</p>
                        </div>
                      </div>
                    </td>

                    {/* Gender */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isMale ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}>
                        {isMale ? "Laki-laki" : "Perempuan"}
                      </span>
                    </td>

                    {/* Parents */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {ayahId || ibuId
                        ? [ayahId && getName(ayahId), ibuId && getName(ibuId)].filter(Boolean).join(" & ")
                        : <span className="text-slate-300">–</span>}
                    </td>

                    {/* Spouse */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {spouseId ? (
                        <span>
                          {getName(spouseId)}
                          {marriage?.status === "CERAI" && <span className="ml-1 text-orange-400">(cerai)</span>}
                          {marriage?.status === "MENINGGAL" && <span className="ml-1 text-slate-400">†</span>}
                        </span>
                      ) : <span className="text-slate-300">–</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {p.is_deceased
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Almarhum/ah</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">Masih hidup</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          title="Hapus"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-slate-400">
                {search || filterGender !== "ALL" || filterStatus !== "ALL"
                  ? "Tidak ada anggota yang cocok dengan filter."
                  : "Belum ada anggota. Klik + Tambah Anggota untuk mulai."}
              </p>
              {(search || filterGender !== "ALL" || filterStatus !== "ALL") && (
                <button
                  onClick={() => { setSearch(""); setFilterGender("ALL"); setFilterStatus("ALL"); }}
                  className="mt-2 text-xs text-indigo-600 hover:underline"
                >
                  Reset filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 backdrop-blur-[1px]" onClick={closePanel} />
      )}

      {/* Side panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
        panelOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-semibold text-slate-800">
            {editingId ? "Edit Anggota" : "Tambah Anggota"}
          </h2>
          <button
            onClick={closePanel}
            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-semibold ${
              form.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
            }`}>
              {form.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.foto_url} alt="foto" className="w-full h-full object-cover" />
              ) : (
                form.nama_lengkap ? form.nama_lengkap[0].toUpperCase() : "?"
              )}
            </div>
            <div className="flex-1">
              <label className="label">Foto</label>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm cursor-pointer hover:bg-slate-50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-slate-600">{uploading ? "Mengupload..." : form.foto_url ? "Ganti foto" : "Upload foto"}</span>
                <input type="file" accept="image/jpeg,image/png" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
              </label>
              {form.foto_url && (
                <button onClick={() => set("foto_url", "")} className="text-xs text-red-400 hover:text-red-600 mt-1">
                  Hapus foto
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="label">Nama Lengkap *</label>
            <input className="input" placeholder="Ahmad Sulaiman"
              value={form.nama_lengkap} onChange={(e) => set("nama_lengkap", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nama Panggilan</label>
              <input className="input" placeholder="Kakek Ahmad"
                value={form.nama_panggilan} onChange={(e) => set("nama_panggilan", e.target.value)} />
            </div>
            <div>
              <label className="label">Jenis Kelamin</label>
              <select className="input" value={form.jenis_kelamin}
                onChange={(e) => set("jenis_kelamin", e.target.value)}>
                <option value="LAKI_LAKI">Laki-laki</option>
                <option value="PEREMPUAN">Perempuan</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_deceased}
              onChange={(e) => set("is_deceased", e.target.checked)}
              className="rounded border-slate-300" />
            Almarhum/ah
          </label>
          <div>
            <label className="label">Catatan</label>
            <textarea className="input resize-none" rows={2} placeholder="Opsional..."
              value={form.catatan} onChange={(e) => set("catatan", e.target.value)} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Orang Tua</p>
            <div className="space-y-3">
              <div>
                <label className="label">Ayah</label>
                <select className="input" value={form.ayah_id}
                  onChange={(e) => set("ayah_id", e.target.value)}>
                  <option value="">– tidak ada –</option>
                  {otherPersons.filter((p) => p.jenis_kelamin === "LAKI_LAKI").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_panggilan ? `${p.nama_panggilan} · ` : ""}{p.nama_lengkap}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ibu</label>
                <select className="input" value={form.ibu_id}
                  onChange={(e) => set("ibu_id", e.target.value)}>
                  <option value="">– tidak ada –</option>
                  {otherPersons.filter((p) => p.jenis_kelamin === "PEREMPUAN").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_panggilan ? `${p.nama_panggilan} · ` : ""}{p.nama_lengkap}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(form.ayah_id || form.ibu_id) && (
              <div className="mt-3">
                <label className="label">Anak ke- (urutan lahir)</label>
                <input type="number" min="1" className="input w-24" placeholder="1, 2, 3..."
                  value={form.urutan_lahir} onChange={(e) => set("urutan_lahir", e.target.value)} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pernikahan</p>
            <div className="space-y-3">
              <div>
                <label className="label">Pasangan</label>
                <select className="input" value={form.pasangan_id}
                  onChange={(e) => set("pasangan_id", e.target.value)}>
                  <option value="">– belum menikah –</option>
                  {otherPersons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_panggilan ? `${p.nama_panggilan} · ` : ""}{p.nama_lengkap}
                    </option>
                  ))}
                </select>
              </div>
              {form.pasangan_id && (
                <div>
                  <label className="label">Status Pernikahan</label>
                  <select className="input" value={form.status_nikah}
                    onChange={(e) => set("status_nikah", e.target.value)}>
                    <option value="AKTIF">Masih menikah</option>
                    <option value="CERAI">Cerai</option>
                    <option value="MENINGGAL">Salah satu/keduanya wafat</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !form.nama_lengkap.trim()}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Anggota"}
          </button>
          <button onClick={closePanel}
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
