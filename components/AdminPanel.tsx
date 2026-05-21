"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { signOut } from "next-auth/react";
import { Person, Relationship, Marriage, JenisKelamin, StatusPernikahan } from "@prisma/client";

const PhotoCropper = dynamic(() => import("./PhotoCropper"), { ssr: false });

// ── Reusable searchable person picker (desktop dropdown only)  ─────────────────
// On mobile the parent panel swaps content — onMobilePick() is called instead.
interface PersonPickerProps {
  value: string;
  onChange: (id: string) => void;
  options: Person[];
  placeholder: string;
  onMobilePick?: () => void; // mobile: delegate to parent panel
}

function PersonPicker({ value, onChange, options, placeholder, onMobilePick }: PersonPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((p) => p.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (p) =>
        p.nama_lengkap.toLowerCase().includes(q) ||
        (p.nama_panggilan?.toLowerCase().includes(q) ?? false)
    );
  }, [options, search]);

  // Close on outside click (desktop only)
  useEffect(() => {
    if (!open || onMobilePick) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onMobilePick]);

  // Focus search on open
  useEffect(() => {
    if (open && !onMobilePick) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open, onMobilePick]);

  const selectOption = (id: string) => {
    onChange(id);
    setOpen(false); setSearch("");
  };

  const getInitials = (p: Person) =>
    p.nama_lengkap.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => onMobilePick ? onMobilePick() : setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between gap-2
          text-sm border rounded-xl px-3 py-2.5 bg-white text-left
          transition-all duration-150
          ${open && !onMobilePick ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"}
        `}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
              selected.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
            }`}>{getInitials(selected)}</span>
            <span className="font-medium text-slate-800 truncate">{selected.nama_panggilan || selected.nama_lengkap.split(" ")[0]}</span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-150 ${open && !onMobilePick ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Desktop dropdown */}
      {open && !onMobilePick && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input ref={searchRef} type="text" placeholder="Cari nama..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400" />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <button type="button" onClick={() => selectOption("")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm border-b border-slate-50 ${!value ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:bg-slate-50"}`}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] bg-slate-100 text-slate-400 flex-shrink-0">–</span>
            <span className="text-sm italic">{placeholder}</span>
            {!value && <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          </button>
          <div className="max-h-48 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Tidak ditemukan</p>
            ) : filtered.map((p) => (
              <button key={p.id} type="button" onClick={() => selectOption(p.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${p.id === value ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${p.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                  {getInitials(p)}
                </span>
                <span className="min-w-0">
                  <span className="font-medium block truncate">{p.nama_panggilan || p.nama_lengkap.split(" ")[0]}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{p.nama_lengkap}</span>
                </span>
                {p.id === value && <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small chip for relation display inside view modal ─────────────────────────
type ChipColor = "blue" | "pink" | "rose" | "orange" | "emerald" | "amber";
function RelChip({ id, persons, label, color = "slate" }: { id: string; persons: Person[]; label?: string; color?: ChipColor | "slate" }) {
  const p = persons.find((x) => x.id === id);
  if (!p) return null;
  const isMale = p.jenis_kelamin === "LAKI_LAKI";
  const initials = p.nama_lengkap.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const avatarCls = isMale ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700";
  const labelCls: Record<ChipColor | "slate", string> = {
    blue: "bg-blue-50 text-blue-600", pink: "bg-pink-50 text-pink-600",
    rose: "bg-rose-50 text-rose-600", orange: "bg-orange-50 text-orange-500",
    emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0 ${avatarCls}`}>{initials}</div>
      <span className="text-sm text-slate-700 font-medium truncate">{p.nama_panggilan || p.nama_lengkap.split(" ")[0]}</span>
      <span className="text-xs text-slate-400 truncate hidden sm:block">{p.nama_lengkap}</span>
      {label && <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${labelCls[color]}`}>{label}</span>}
    </div>
  );
}

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

type RelativeType = "ayah" | "ibu" | "pasangan" | "saudara" | "anak";
type RelativeContext = { type: RelativeType; forPersonId: string };

type FilterGender = "ALL" | "LAKI_LAKI" | "PEREMPUAN";
type FilterStatus = "ALL" | "ALIVE" | "DECEASED";

export default function AdminPanel({ initialPersons, initialRelationships, initialMarriages }: AdminPanelProps) {
  const [persons, setPersons] = useState(initialPersons);
  const [relationships, setRelationships] = useState(initialRelationships);
  const [marriages, setMarriages] = useState(initialMarriages);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [relativeContext, setRelativeContext] = useState<RelativeContext | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Mobile detection for panel layout
  const [isMobilePanel, setIsMobilePanel] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelAnimIn, setPanelAnimIn] = useState(false);

  // Active picker replaces form content on mobile
  type PickerField = "ayah_id" | "ibu_id" | "pasangan_id";
  const [activePicker, setActivePicker] = useState<{
    field: PickerField;
    options: Person[];
    placeholder: string;
    search: string;
  } | null>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  // Auto-focus picker search when it opens
  useEffect(() => {
    if (activePicker) setTimeout(() => pickerSearchRef.current?.focus(), 150);
  }, [activePicker]);

  useEffect(() => {
    setPanelMounted(true);
    const check = () => setIsMobilePanel(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Animate panel in/out
  useEffect(() => {
    if (panelOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelAnimIn(true)));
    } else {
      setPanelAnimIn(false);
    }
  }, [panelOpen]);

  // View modal
  const [viewPersonId, setViewPersonId] = useState<string | null>(null);

  // Dropdown per row
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<FilterGender>("ALL");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  // Mobile filter bottom sheet
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterSheetAnimIn, setFilterSheetAnimIn] = useState(false);
  const [draftGender, setDraftGender] = useState<FilterGender>("ALL");
  const [draftStatus, setDraftStatus] = useState<FilterStatus>("ALL");

  const openFilterSheet = () => {
    setDraftGender(filterGender);
    setDraftStatus(filterStatus);
    setFilterSheetOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFilterSheetAnimIn(true)));
  };
  const closeFilterSheet = () => {
    setFilterSheetAnimIn(false);
    setTimeout(() => setFilterSheetOpen(false), 300);
  };
  const applyFilter = () => {
    setFilterGender(draftGender);
    setFilterStatus(draftStatus);
    closeFilterSheet();
  };
  const activeFilterCount = (filterGender !== "ALL" ? 1 : 0) + (filterStatus !== "ALL" ? 1 : 0);

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

  // Close dropdown when clicking anywhere outside
  useEffect(() => {
    if (!activeDropdownId) return;
    const handler = () => setActiveDropdownId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [activeDropdownId]);

  // ── open panel ───────────────────────────────────────────────────────
  function openNew() {
    setEditingId(null);
    setRelativeContext(null);
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

  function openAddRelative(type: RelativeType, forPerson: Person) {
    setEditingId(null);
    setRelativeContext({ type, forPersonId: forPerson.id });
    const f = emptyForm();
    switch (type) {
      case "anak":
        if (forPerson.jenis_kelamin === "LAKI_LAKI") f.ayah_id = forPerson.id;
        else f.ibu_id = forPerson.id;
        break;
      case "pasangan":
        f.pasangan_id = forPerson.id;
        f.jenis_kelamin = forPerson.jenis_kelamin === "LAKI_LAKI" ? "PEREMPUAN" : "LAKI_LAKI";
        break;
      case "saudara":
        f.ayah_id = getAyah(forPerson.id);
        f.ibu_id = getIbu(forPerson.id);
        break;
      case "ayah":
        f.jenis_kelamin = "LAKI_LAKI";
        break;
      case "ibu":
        f.jenis_kelamin = "PEREMPUAN";
        break;
    }
    setForm(f);
    setActiveDropdownId(null);
    setPanelOpen(true);
  }

  function getPanelTitle() {
    if (relativeContext) {
      const fp = persons.find((x) => x.id === relativeContext.forPersonId);
      const name = fp ? (fp.nama_panggilan || fp.nama_lengkap.split(" ")[0]) : "";
      const labels: Record<RelativeType, string> = {
        ayah: `Tambah Ayah untuk ${name}`,
        ibu: `Tambah Ibu untuk ${name}`,
        pasangan: `Tambah Pasangan untuk ${name}`,
        saudara: `Tambah Saudara untuk ${name}`,
        anak: `Tambah Anak untuk ${name}`,
      };
      return labels[relativeContext.type];
    }
    return editingId ? "Edit Anggota" : "Tambah Anggota";
  }

  // Step 1: validate + show cropper
  function handlePhotoSelect(file: File) {
    const MAX = 10 * 1024 * 1024;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Hanya file JPG dan PNG yang diizinkan.");
      return;
    }
    if (file.size > MAX) {
      alert("Ukuran file maksimal 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Step 2: upload cropped blob
  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
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
    setPanelAnimIn(false);
    setActivePicker(null);
    setTimeout(() => {
      setPanelOpen(false);
      setEditingId(null);
      setRelativeContext(null);
      setForm(emptyForm());
    }, 300);
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

      // Reverse-relationship: new person is the parent OF another person
      if (!editingId && relativeContext && (relativeContext.type === "ayah" || relativeContext.type === "ibu")) {
        const tipe = relativeContext.type === "ayah" ? "AYAH_KANDUNG" : "IBU_KANDUNG";
        const r = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: relativeContext.forPersonId, related_id: personId, tipe }),
        });
        if (r.ok) newRels.push(await r.json());
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
      <header className="bg-white border-b border-slate-200 px-3 md:px-6 py-3 flex items-center gap-2 md:gap-3 sticky top-0 z-20">
        <a href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Pohon Keluarga</span>
        </a>
        <span className="text-slate-200 hidden sm:inline">|</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="font-semibold text-slate-800 text-sm">Admin Panel</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-sm px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Tambah Anggota</span>
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2 md:px-3 py-2 rounded-lg transition-colors hover:bg-slate-50"
          >
            <span className="hidden sm:inline">Logout</span>
            <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-5">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
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
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
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

          {/* Desktop inline filters */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {/* Gender filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {(["ALL", "LAKI_LAKI", "PEREMPUAN"] as FilterGender[]).map((v) => (
                <button key={v} onClick={() => setFilterGender(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterGender === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>
                  {v === "ALL" ? "Semua" : v === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
                </button>
              ))}
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {(["ALL", "ALIVE", "DECEASED"] as FilterStatus[]).map((v) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>
                  {v === "ALL" ? "Semua" : v === "ALIVE" ? "Masih hidup" : "Almarhum"}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 ml-1">{filtered.length} dari {persons.length}</span>
          </div>

          {/* Mobile filter button */}
          <button
            onClick={openFilterSheet}
            className={`sm:hidden relative flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors flex-shrink-0 ${
              activeFilterCount > 0
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="font-medium">Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-indigo-600 text-[10px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile: active filter chips */}
        {activeFilterCount > 0 && (
          <div className="sm:hidden flex items-center gap-2 flex-wrap">
            {filterGender !== "ALL" && (
              <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
                {filterGender === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
                <button onClick={() => setFilterGender("ALL")} className="ml-0.5 text-indigo-400 hover:text-indigo-700">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            )}
            {filterStatus !== "ALL" && (
              <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
                {filterStatus === "ALIVE" ? "Masih hidup" : "Almarhum"}
                <button onClick={() => setFilterStatus("ALL")} className="ml-0.5 text-indigo-400 hover:text-indigo-700">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            )}
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} dari {persons.length}</span>
          </div>
        )}

        {/* Table — desktop only */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kelamin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Orang Tua</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pasangan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-36"></th>
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
                            {p.is_deceased && (
                            <svg className="inline w-3 h-3 ml-1 text-slate-400 -translate-y-px" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 2.25 12c0 5.385 4.365 9.75 9.75 9.75 4.93 0 9.022-3.657 9.752-8.998Z" />
                            </svg>
                          )}
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
                          {marriage?.status === "MENINGGAL" && (
                            <svg className="inline w-3 h-3 ml-1 text-slate-400 -translate-y-px" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 2.25 12c0 5.385 4.365 9.75 9.75 9.75 4.93 0 9.022-3.657 9.752-8.998Z" />
                            </svg>
                          )}
                        </span>
                      ) : <span className="text-slate-300">–</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {p.is_deceased
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">{isMale ? "Almarhum" : "Almarhumah"}</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">Masih hidup</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* View */}
                        <button
                          onClick={() => setViewPersonId(p.id)}
                          title="Lihat"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Add relative dropdown */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === p.id ? null : p.id); }}
                            title="Tambah Kerabat"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                          </button>
                          {activeDropdownId === p.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[168px] overflow-hidden">
                              {([
                                { type: "ayah", label: "Tambah Ayah", color: "text-blue-600" },
                                { type: "ibu", label: "Tambah Ibu", color: "text-pink-600" },
                                { type: "pasangan", label: "Tambah Pasangan", color: "text-rose-500" },
                                { type: "saudara", label: "Tambah Saudara", color: "text-amber-600" },
                                { type: "anak", label: "Tambah Anak", color: "text-emerald-600" },
                              ] as { type: RelativeType; label: string; color: string }[]).map((item) => (
                                <button
                                  key={item.type}
                                  onClick={(e) => { e.stopPropagation(); openAddRelative(item.type, p); }}
                                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors ${item.color} font-medium`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
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

        {/* Card list — mobile only */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-sm text-slate-400">
                {search || filterGender !== "ALL" || filterStatus !== "ALL"
                  ? "Tidak ada anggota yang cocok."
                  : "Belum ada anggota."}
              </p>
            </div>
          ) : filtered.map((p) => {
            const ayahId = getAyah(p.id);
            const ibuId = getIbu(p.id);
            const spouseId = getSpouseId(p.id);
            const marriage = getMarriage(p.id);
            const isMale = p.jenis_kelamin === "LAKI_LAKI";
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt={p.nama_lengkap} className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${p.is_deceased ? "grayscale opacity-60" : ""}`} />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${isMale ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}>
                      {p.nama_lengkap[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`font-medium text-sm ${p.is_deceased ? "text-slate-400" : "text-slate-800"}`}>
                        {p.nama_panggilan || p.nama_lengkap.split(" ")[0]}
                        {p.is_deceased && (
                          <svg className="inline w-3 h-3 ml-1 text-slate-400 -translate-y-px" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 2.25 12c0 5.385 4.365 9.75 9.75 9.75 4.93 0 9.022-3.657 9.752-8.998Z" />
                          </svg>
                        )}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isMale ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}>
                        {isMale ? "L" : "P"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{p.nama_lengkap}</p>
                    {(ayahId || ibuId) && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        👪 {[ayahId && getName(ayahId), ibuId && getName(ibuId)].filter(Boolean).join(" & ")}
                      </p>
                    )}
                    {spouseId && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        ❤️ {getName(spouseId)}
                        {marriage?.status === "CERAI" && <span className="ml-1 text-orange-400">(cerai)</span>}
                      </p>
                    )}
                  </div>
                  {/* Actions always visible on mobile */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setViewPersonId(p.id)} title="Lihat" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(p.id)} title="Hapus" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── View modal ── */}
      {viewPersonId && (() => {
        const vp = persons.find((x) => x.id === viewPersonId);
        if (!vp) return null;
        const isMaleV = vp.jenis_kelamin === "LAKI_LAKI";
        const initialsV = vp.nama_lengkap.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
        const ayahIdV = getAyah(vp.id);
        const ibuIdV = getIbu(vp.id);
        const spouseIdV = getSpouseId(vp.id);
        const marriageV = getMarriage(vp.id);
        const childrenV = relationships
          .filter((r) => r.related_id === vp.id && (r.tipe === "AYAH_KANDUNG" || r.tipe === "IBU_KANDUNG"))
          .map((r) => r.person_id);
        return (
          <>
            <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-[2px]" onClick={() => setViewPersonId(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
                {/* Hero photo banner */}
                <div className="relative w-full aspect-square overflow-hidden">
                  {vp.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={vp.foto_url} alt={vp.nama_lengkap}
                      className={`w-full h-full object-cover ${vp.is_deceased ? "grayscale opacity-80" : ""}`} />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${isMaleV ? "bg-gradient-to-br from-blue-100 to-blue-200" : "bg-gradient-to-br from-pink-100 to-pink-200"}`}>
                      <span className={`text-7xl font-bold ${isMaleV ? "text-blue-300" : "text-pink-300"}`}>{initialsV}</span>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/65 to-transparent" />
                  {/* Close button */}
                  <button onClick={() => setViewPersonId(null)}
                    className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                    <p className="font-bold text-lg text-white leading-tight drop-shadow">
                      {vp.nama_panggilan || vp.nama_lengkap.split(" ")[0]}
                      {vp.is_deceased && (
                        <svg className="inline w-3.5 h-3.5 ml-1.5 text-white/70 -translate-y-px" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 2.25 12c0 5.385 4.365 9.75 9.75 9.75 4.93 0 9.022-3.657 9.752-8.998Z" />
                        </svg>
                      )}
                    </p>
                    <p className="text-xs text-white/75 truncate drop-shadow">{vp.nama_lengkap}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="px-5 pt-3 pb-3 border-b border-slate-100 flex flex-wrap gap-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isMaleV ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                    {isMaleV ? "Laki-laki" : "Perempuan"}
                  </span>
                  {vp.urutan_lahir && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Anak ke-{vp.urutan_lahir}</span>
                  )}
                  {vp.is_deceased && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{isMaleV ? "Almarhum" : "Almarhumah"}</span>
                  )}
                </div>

                {/* Catatan */}
                {vp.catatan && (
                  <div className="px-5 pt-3 pb-0">
                    <p className="text-xs text-slate-500 leading-relaxed">{vp.catatan}</p>
                  </div>
                )}

                {/* Relations */}
                <div className="px-6 py-4 space-y-3">
                  {/* Parents */}
                  {(ayahIdV || ibuIdV) && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Orang Tua</p>
                      <div className="flex flex-col gap-1">
                        {ayahIdV && <RelChip id={ayahIdV} persons={persons} label="Ayah" color="blue" />}
                        {ibuIdV && <RelChip id={ibuIdV} persons={persons} label="Ibu" color="pink" />}
                      </div>
                    </div>
                  )}
                  {/* Spouse */}
                  {spouseIdV && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Pasangan</p>
                      <RelChip id={spouseIdV} persons={persons} label={
                        marriageV?.status === "CERAI" ? "Cerai" : marriageV?.status === "MENINGGAL" ? "Wafat" : "Menikah"
                      } color={marriageV?.status === "CERAI" ? "orange" : "rose"} />
                    </div>
                  )}
                  {/* Children */}
                  {childrenV.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Anak ({childrenV.length})</p>
                      <div className="flex flex-col gap-1">
                        {childrenV.map((cid) => <RelChip key={cid} id={cid} persons={persons} color="emerald" />)}
                      </div>
                    </div>
                  )}
                  {!ayahIdV && !ibuIdV && !spouseIdV && childrenV.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">Belum ada relasi tercatat</p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 flex gap-2">
                  <button
                    onClick={() => { setViewPersonId(null); openEdit(vp); }}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setViewPersonId(null)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Overlay */}
      {panelMounted && panelOpen && (
        <div
          className={`fixed inset-0 z-30 transition-opacity duration-300 ${panelAnimIn ? "opacity-100" : "opacity-0"} ${isMobilePanel ? "bg-black/40" : "bg-black/20 backdrop-blur-[1px]"}`}
          onClick={closePanel}
        />
      )}

      {/* Form panel — bottom sheet on mobile, right sidebar on desktop */}
      <div className={`fixed z-40 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isMobilePanel
          ? `bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden ${panelAnimIn ? "translate-y-0" : "translate-y-full"}`
          : `top-0 right-0 h-full w-96 ${panelAnimIn ? "translate-x-0" : "translate-x-full"}`
      }`}
      style={isMobilePanel ? { maxHeight: "92vh" } : {}}
      >
        {/* Drag handle — mobile only */}
        {isMobilePanel && (
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
        )}

        {/* Panel header */}
        <div className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex-shrink-0">
          {/* Back button — shown when mobile picker is active */}
          {activePicker && (
            <button
              onClick={() => setActivePicker(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="font-semibold text-slate-800 text-sm leading-tight flex-1 truncate">
            {activePicker ? activePicker.placeholder : getPanelTitle()}
          </h2>
          <button
            onClick={closePanel}
            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel body — picker view or form */}
        {activePicker ? (
          // ── Mobile inline picker ─────────────────────────────────────────
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search — sticky */}
            <div className="px-4 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 rounded-xl">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={pickerSearchRef}
                  type="text"
                  placeholder="Cari nama..."
                  value={activePicker.search}
                  onChange={(e) => setActivePicker((prev) => prev ? { ...prev, search: e.target.value } : prev)}
                  className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                />
                {activePicker.search && (
                  <button onClick={() => setActivePicker((prev) => prev ? { ...prev, search: "" } : prev)} className="text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Options — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
              {/* Clear option */}
              <button type="button"
                onClick={() => { set(activePicker.field, ""); setActivePicker(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-b border-slate-50 ${!form[activePicker.field] ? "bg-indigo-50 text-indigo-700" : "text-slate-400 active:bg-slate-50"}`}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs bg-slate-100 text-slate-400 flex-shrink-0">–</span>
                <span className="italic">{activePicker.placeholder}</span>
                {!form[activePicker.field] && <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              {(() => {
                const q = activePicker.search.toLowerCase().trim();
                const filtered = q
                  ? activePicker.options.filter((p) =>
                      p.nama_lengkap.toLowerCase().includes(q) ||
                      (p.nama_panggilan?.toLowerCase().includes(q) ?? false)
                    )
                  : activePicker.options;
                if (filtered.length === 0)
                  return <p className="text-sm text-slate-400 text-center py-8">Tidak ditemukan</p>;
                return filtered.map((p) => {
                  const initials = p.nama_lengkap.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                  const selected = form[activePicker.field] === p.id;
                  return (
                    <button key={p.id} type="button"
                      onClick={() => { set(activePicker.field, p.id); setActivePicker(null); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${selected ? "bg-indigo-50 text-indigo-700" : "active:bg-slate-50 text-slate-700"}`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${p.jenis_kelamin === "LAKI_LAKI" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium block truncate">{p.nama_panggilan || p.nama_lengkap.split(" ")[0]}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{p.nama_lengkap}</span>
                      </span>
                      {selected && <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        ) : (

        // ── Form ──────────────────────────────────────────────────────────
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4 md:py-5 space-y-4">
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
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); e.target.value = ""; }} />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">JPG / PNG · maks. 10 MB</p>
              {form.foto_url && (
                <button onClick={() => set("foto_url", "")} className="text-xs text-red-400 hover:text-red-600 mt-0.5">
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
              <div className="flex gap-2 mt-1">
                {(["LAKI_LAKI", "PEREMPUAN"] as JenisKelamin[]).map((v) => (
                  <label
                    key={v}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-all select-none flex-1 justify-center
                      ${form.jenis_kelamin === v
                        ? v === "LAKI_LAKI"
                          ? "border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-pink-400 bg-pink-50 text-pink-700 ring-2 ring-pink-100"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="jenis_kelamin"
                      value={v}
                      checked={form.jenis_kelamin === v}
                      onChange={() => set("jenis_kelamin", v)}
                      className="sr-only"
                    />
                    <span>{v === "LAKI_LAKI" ? "♂ Laki-laki" : "♀ Perempuan"}</span>
                  </label>
                ))}
              </div>
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
                <PersonPicker
                  value={form.ayah_id}
                  onChange={(id) => set("ayah_id", id)}
                  options={otherPersons.filter((p) => p.jenis_kelamin === "LAKI_LAKI")}
                  placeholder="– tidak ada –"
                  onMobilePick={isMobilePanel ? () => setActivePicker({ field: "ayah_id", options: otherPersons.filter((p) => p.jenis_kelamin === "LAKI_LAKI"), placeholder: "Pilih Ayah", search: "" }) : undefined}
                />
              </div>
              <div>
                <label className="label">Ibu</label>
                <PersonPicker
                  value={form.ibu_id}
                  onChange={(id) => set("ibu_id", id)}
                  options={otherPersons.filter((p) => p.jenis_kelamin === "PEREMPUAN")}
                  placeholder="– tidak ada –"
                  onMobilePick={isMobilePanel ? () => setActivePicker({ field: "ibu_id", options: otherPersons.filter((p) => p.jenis_kelamin === "PEREMPUAN"), placeholder: "Pilih Ibu", search: "" }) : undefined}
                />
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
                <PersonPicker
                  value={form.pasangan_id}
                  onChange={(id) => set("pasangan_id", id)}
                  options={otherPersons}
                  placeholder="– belum menikah –"
                  onMobilePick={isMobilePanel ? () => setActivePicker({ field: "pasangan_id", options: otherPersons, placeholder: "Pilih Pasangan", search: "" }) : undefined}
                />
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
        )} {/* end activePicker ternary */}

        {/* Panel footer — hidden when picker is active */}
        {!activePicker && (
          <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || !form.nama_lengkap.trim()}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan"}
            </button>
            <button onClick={closePanel}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Batal
            </button>
          </div>
        )}
      </div>

      {/* ── Photo cropper ── */}
      {cropSrc && (
        <PhotoCropper
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* ── Mobile filter bottom sheet ── */}
      {filterSheetOpen && (
        <>
          <div
            className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${filterSheetAnimIn ? "opacity-100" : "opacity-0"}`}
            onClick={closeFilterSheet}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out overflow-hidden"
            style={{ transform: filterSheetAnimIn ? "translateY(0)" : "translateY(100%)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-semibold text-slate-800">Filter</h3>
              <button onClick={closeFilterSheet} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Filter options */}
            <div className="px-4 py-5 space-y-5">
              {/* Gender */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Jenis Kelamin</p>
                <div className="flex gap-2">
                  {(["ALL", "LAKI_LAKI", "PEREMPUAN"] as FilterGender[]).map((v) => (
                    <button key={v} onClick={() => setDraftGender(v)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                        draftGender === v ? "bg-indigo-50 text-indigo-600 border-indigo-400" : "bg-white text-slate-500 border-slate-200"
                      }`}>
                      {v === "ALL" ? "Semua" : v === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Status</p>
                <div className="flex gap-2">
                  {(["ALL", "ALIVE", "DECEASED"] as FilterStatus[]).map((v) => (
                    <button key={v} onClick={() => setDraftStatus(v)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                        draftStatus === v ? "bg-indigo-50 text-indigo-600 border-indigo-400" : "bg-white text-slate-500 border-slate-200"
                      }`}>
                      {v === "ALL" ? "Semua" : v === "ALIVE" ? "Masih hidup" : "Almarhum"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Footer buttons */}
            <div className="px-4 pb-8 pt-2 flex gap-2 flex-shrink-0">
              <button
                onClick={applyFilter}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Terapkan
              </button>
              <button
                onClick={closeFilterSheet}
                className="px-5 py-3 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
