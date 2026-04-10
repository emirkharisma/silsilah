"use client";

import { useState } from "react";
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

export default function AdminPanel({ initialPersons, initialRelationships, initialMarriages }: AdminPanelProps) {
  const [persons, setPersons] = useState(initialPersons);
  const [relationships, setRelationships] = useState(initialRelationships);
  const [marriages, setMarriages] = useState(initialMarriages);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

      // Parent relationships
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

      // Marriage
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
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
        <a href="/" className="text-slate-400 hover:text-slate-700 text-sm">← Pohon Keluarga</a>
        <span className="text-slate-300">|</span>
        <h1 className="font-semibold text-slate-800">Admin Panel</h1>
        <span className="text-xs text-slate-400">{persons.length} anggota</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={openNew}
            className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            + Tambah Anggota
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>

      {/* List */}
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {persons.map((p) => {
              const ayahId = getAyah(p.id);
              const ibuId = getIbu(p.id);
              const spouseId = getSpouseId(p.id);
              const marriage = getMarriage(p.id);
              return (
                <div key={p.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                    p.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                  }`}>
                    {p.nama_lengkap[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {p.nama_panggilan ? `${p.nama_panggilan} · ` : ""}
                      <span className="font-normal">{p.nama_lengkap}</span>
                      {p.is_deceased && <span className="ml-1 text-slate-400 text-xs">†</span>}
                    </p>
                    <div className="flex flex-wrap gap-x-4 mt-0.5">
                      {(ayahId || ibuId) && (
                        <p className="text-xs text-slate-400">
                          Anak dari {[ayahId && getName(ayahId), ibuId && getName(ibuId)].filter(Boolean).join(" & ")}
                        </p>
                      )}
                      {spouseId && (
                        <p className="text-xs text-slate-400">
                          {marriage?.status === "CERAI" ? "Mantan pasangan" : "Pasangan"}: {getName(spouseId)}
                          {marriage?.status === "MENINGGAL" && " †"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 flex-shrink-0 text-xs pt-0.5">
                    <button onClick={() => openEdit(p)} className="text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 font-medium">Hapus</button>
                  </div>
                </div>
              );
            })}
            {persons.length === 0 && (
              <p className="px-6 py-16 text-center text-sm text-slate-400">
                Belum ada anggota. Klik <strong>+ Tambah Anggota</strong> untuk mulai.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {panelOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={closePanel}
        />
      )}

      {/* Side panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${
        panelOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-semibold text-slate-800">
            {editingId ? "Edit Anggota" : "Tambah Anggota"}
          </h2>
          <button onClick={closePanel} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-semibold ${
              form.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"
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

          {/* Basic */}
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
          <div>
            <label className="label">Anak ke- (urutan lahir)</label>
            <input type="number" min="1" className="input w-24" placeholder="1, 2, 3..."
              value={form.urutan_lahir} onChange={(e) => set("urutan_lahir", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
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

          {/* Parents */}
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
          </div>

          {/* Marriage */}
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
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
