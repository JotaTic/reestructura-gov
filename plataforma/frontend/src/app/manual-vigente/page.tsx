"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { LegacyManual, Paginated } from "@/types";
import { FileStack, Plus, Upload } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function ManualVigentePage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const router = useRouter();
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);

  const [manuals, setManuals] = useState<LegacyManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", act_reference: "", issue_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import modal
  const [importingManual, setImportingManual] = useState<LegacyManual | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importReport, setImportReport] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<LegacyManual>>("/manuales-vigentes/", { page_size: 50 })
      .then((d) => setManuals(d.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, version]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post<LegacyManual>("/manuales-vigentes/", {
        entity: activeEntity.id,
        ...form,
        issue_date: form.issue_date || null,
      });
      setShowForm(false);
      setForm({ name: "", act_reference: "", issue_date: "", notes: "" });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear manual");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importingManual || !importFile) return;
    setImportLoading(true);
    setImportReport(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await api.postForm<Record<string, unknown>>(
        `/manuales-vigentes/${importingManual.id}/importar-docx/`,
        formData
      );
      setImportReport(result);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileStack className="text-brand-600" size={24} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Manual de Funciones Vigente</h1>
            <p className="text-sm text-slate-500">Manual actual antes de la reestructuración · M12+</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/manual-vigente/comparar")}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Comparar con propuesta
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Nuevo manual
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Nuevo Manual Vigente</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Manual vigente 2018"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Acto que lo adoptó</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.act_reference}
                onChange={(e) => setForm({ ...form, act_reference: e.target.value })}
                placeholder="Decreto 0123/2018"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de emisión</label>
              <input
                type="date"
                className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.issue_date}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Crear manual"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Modal */}
      {importingManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              Importar DOCX — {importingManual.name}
            </h2>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              className="mb-4 block w-full text-sm text-slate-600"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            {importReport && (
              <div className="mb-4 rounded bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-medium mb-1">Reporte de importación:</p>
                <p>Cargos detectados: <strong>{String(importReport.roles_created)}</strong></p>
                <p>Funciones detectadas: <strong>{String(importReport.functions_created)}</strong></p>
                {Array.isArray(importReport.warnings) && importReport.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-amber-700">Advertencias:</p>
                    {(importReport.warnings as string[]).map((w, i) => (
                      <p key={i} className="text-amber-700">{w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={!importFile || importLoading}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {importLoading ? "Importando..." : "Importar"}
              </button>
              <button
                onClick={() => { setImportingManual(null); setImportFile(null); setImportReport(null); }}
                className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Cargando manuales...</div>
      ) : manuals.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <FileStack className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">No hay manuales vigentes registrados</p>
          <p className="mt-1 text-xs text-slate-400">Crea un manual e importa el DOCX del manual actual.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Acto</th>
                <th className="px-4 py-3 text-center">Fecha</th>
                <th className="px-4 py-3 text-center">Cargos</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {manuals.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-slate-500">{m.act_reference || "—"}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{m.issue_date || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {m.roles_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setImportingManual(m)}
                        className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                      >
                        <Upload size={12} /> Importar DOCX
                      </button>
                      <button
                        onClick={() => router.push(`/manual-vigente/${m.id}`)}
                        className="rounded bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                      >
                        Ver cargos
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
