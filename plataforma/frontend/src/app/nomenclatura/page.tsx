"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { JobNomenclature } from "@/types";
import { FileSpreadsheet } from "lucide-react";

const LEVEL_TABS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "DIRECTIVO", label: "Directivo" },
  { value: "ASESOR", label: "Asesor" },
  { value: "PROFESIONAL", label: "Profesional" },
  { value: "TECNICO", label: "Técnico" },
  { value: "ASISTENCIAL", label: "Asistencial" },
];

export default function NomenclaturaPage() {
  const [items, setItems] = useState<JobNomenclature[]>([]);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"" | "NACIONAL" | "TERRITORIAL">("TERRITORIAL");
  const [levelFilter, setLevelFilter] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadItems = () => {
    api.get<JobNomenclature[]>("/nomenclatura/").then(setItems);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleImportXlsx = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await api.postForm<Record<string, unknown>>(
        `/nomenclatura/importar-xlsx/`,
        formData
      );
      setImportResult(result);
      loadItems();
    } catch (e: unknown) {
      setImportResult({ error: e instanceof Error ? e.message : "Error al importar" });
    } finally {
      setImporting(false);
    }
  };

  const filtered = items.filter(
    (i) =>
      (scope === "" || i.scope === scope) &&
      (levelFilter === "" || i.level === levelFilter) &&
      (q === "" ||
        i.denomination.toLowerCase().includes(q.toLowerCase()) ||
        i.code.includes(q))
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nomenclatura oficial</h1>
          <p className="text-sm text-slate-600">
            Catálogo de denominaciones y códigos de empleo (Decreto 785/2005 ·
            Decreto 2489/2006).
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FileSpreadsheet size={16} /> Importar Excel
        </button>
      </div>

      {/* Level filter tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
        {LEVEL_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setLevelFilter(tab.value)}
            className={
              "rounded-t-md border-b-2 px-3 py-1.5 text-xs font-medium transition " +
              (levelFilter === tab.value
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-500 hover:text-slate-800")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por denominación o código…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "" | "NACIONAL" | "TERRITORIAL")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="TERRITORIAL">Territorial (785/2005)</option>
          <option value="NACIONAL">Nacional (2489/2006)</option>
        </select>
      </div>

      {/* Modal importar Excel */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Importar Nomenclatura desde Excel</h2>
            <p className="mb-3 text-sm text-slate-600">
              Adjunta un archivo <strong>.xlsx</strong> con las denominaciones y códigos de empleo.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="mb-4 block w-full text-sm text-slate-600"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            {importResult && (
              <div className="mb-4 rounded bg-slate-50 p-3 text-xs text-slate-700">
                {importResult.error ? (
                  <p className="text-red-600">{String(importResult.error)}</p>
                ) : (
                  <>
                    {importResult.created !== undefined && (
                      <p>Registros creados: <strong>{String(importResult.created)}</strong></p>
                    )}
                    {importResult.updated !== undefined && (
                      <p>Registros actualizados: <strong>{String(importResult.updated)}</strong></p>
                    )}
                    {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                      <div className="mt-1 text-red-600">
                        {(importResult.errors as string[]).map((err, i) => <p key={i}>{err}</p>)}
                      </div>
                    )}
                    {Array.isArray(importResult.warnings) && importResult.warnings.length > 0 && (
                      <div className="mt-1 text-amber-700">
                        {(importResult.warnings as string[]).map((w, i) => <p key={i}>{w}</p>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleImportXlsx}
                disabled={!importFile || importing}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {importing ? "Importando…" : "Importar"}
              </button>
              <button
                onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }}
                className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-left">Denominación</th>
              <th className="p-2 text-left">Nivel</th>
              <th className="p-2 text-left">Ámbito</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-2 font-mono">{i.code}</td>
                <td className="p-2">{i.denomination}</td>
                <td className="p-2">{i.level_display}</td>
                <td className="p-2 text-xs text-slate-500">{i.scope_display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
