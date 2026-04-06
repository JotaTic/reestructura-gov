"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Employee, IdType, Paginated, Sex } from "@/types";
import { IdCard, Plus, Search, Upload } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function EmpleadosPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

const ID_TYPES: { value: IdType; label: string }[] = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "RC", label: "Registro civil" },
];

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "NB", label: "No binario" },
];

function calcAge(birthDate: string): number {
  const today = new Date();
  const bd = new Date(birthDate);
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

function emptyForm(entityId: number): Partial<Employee> {
  return {
    entity: entityId,
    id_type: "CC",
    id_number: "",
    full_name: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    sex: "M",
    has_disability: false,
    is_head_of_household: false,
    email: "",
    phone: "",
    address: "",
  };
}

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>(emptyForm(activeEntity.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page_size: 100 };
      if (q) params.search = q;
      const d = await api.get<Paginated<Employee>>("/empleados/", params);
      setRows(d.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setForm(emptyForm(activeEntity.id));
  }, [activeEntity.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const fld = (key: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post<Employee>("/empleados/", { ...form, entity: activeEntity.id });
      setShowForm(false);
      setForm(emptyForm(activeEntity.id));
      load();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/empleados/importar-sigep/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "",
            "X-Entity-Id": String(activeEntity.id),
          },
          body: fd,
        }
      );
      const data = await res.json();
      setImportResult(data);
      load();
    } catch (err) {
      setImportResult({ error: String(err) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IdCard className="text-brand-600" size={24} />
          <div>
            <h1 className="text-xl font-bold">Hojas de vida — M15</h1>
            <p className="text-sm text-slate-500">Empleados de {activeEntity.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1 rounded-md bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            <Upload size={14} /> Importar SIGEP
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
          >
            <Plus size={14} /> Nuevo empleado
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o documento..."
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button type="submit" className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
          <Search size={14} /> Buscar
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No hay empleados registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Nombre completo</th>
                <th className="px-4 py-2 text-left">Documento</th>
                <th className="px-4 py-2 text-center">Sexo</th>
                <th className="px-4 py-2 text-center">Edad</th>
                <th className="px-4 py-2 text-center">Jefe hogar</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((emp) => (
                <tr key={emp.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{emp.full_name}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {emp.id_type} {emp.id_number}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {emp.sex === "M" ? "M" : emp.sex === "F" ? "F" : "NB"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {emp.birth_date ? calcAge(emp.birth_date) : "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {emp.is_head_of_household ? "Sí" : "No"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Link
                      href={`/talento/empleados/${emp.id}`}
                      className="rounded bg-brand-600 px-2 py-1 text-xs text-white hover:bg-brand-700"
                    >
                      Ver hoja
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo empleado */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Nuevo empleado</h2>
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Tipo doc.</label>
                <select value={form.id_type} onChange={fld("id_type")} className="mt-1 w-full rounded border px-2 py-1 text-sm">
                  {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Número doc.</label>
                <input value={form.id_number ?? ""} onChange={fld("id_number")} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Nombre completo</label>
                <input value={form.full_name ?? ""} onChange={fld("full_name")} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Nombres</label>
                <input value={form.first_name ?? ""} onChange={fld("first_name")} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Apellidos</label>
                <input value={form.last_name ?? ""} onChange={fld("last_name")} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Fecha nacimiento</label>
                <input type="date" value={form.birth_date ?? ""} onChange={fld("birth_date")} className="mt-1 w-full rounded border px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Sexo</label>
                <select value={form.sex} onChange={fld("sex")} className="mt-1 w-full rounded border px-2 py-1 text-sm">
                  {SEX_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hoh" checked={form.is_head_of_household ?? false} onChange={fld("is_head_of_household")} />
                <label htmlFor="hoh" className="text-xs">Cabeza de hogar</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dis" checked={form.has_disability ?? false} onChange={fld("has_disability")} />
                <label htmlFor="dis" className="text-xs">Tiene discapacidad</label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importar SIGEP */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Importar desde SIGEP</h2>
            <p className="mb-3 text-sm text-slate-600">
              Adjunta un archivo <strong>.xlsx</strong> con las hojas: Información Básica,
              Educación, Experiencia, Capacitación.
            </p>
            <input ref={fileRef} type="file" accept=".xlsx" className="mb-3 w-full text-sm" />
            {importResult && (
              <pre className="mb-3 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-xs">
                {JSON.stringify(importResult, null, 2)}
              </pre>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowImport(false); setImportResult(null); }} className="rounded border px-4 py-2 text-sm">Cerrar</button>
              <button onClick={handleImport} disabled={importing} className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
                {importing ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
