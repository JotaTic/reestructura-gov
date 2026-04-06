"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Procedure, ProcessMap, Paginated } from "@/types";
import { ListOrdered, Plus, Upload } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function ProcedimientosPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const router = useRouter();
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const activeRestructuring = useContextStore((s) => s.activeRestructuring)!;
  const version = useContextStore((s) => s.version);

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [processMaps, setProcessMaps] = useState<ProcessMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProcess, setImportProcess] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Paginated<Procedure>>("/procedimientos/", { page_size: 100 }),
      api.get<Paginated<ProcessMap>>("/mapas-procesos/", { page_size: 50 }),
    ])
      .then(([p, pm]) => {
        setProcedures(p.results);
        setProcessMaps(pm.results);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, activeRestructuring.id, version]);

  const handleImport = async () => {
    if (!importFile || !importProcess) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("process", importProcess);
      const result = await api.postForm<Record<string, unknown>>(
        `/procedimientos/importar-docx/`,
        formData
      );
      setImportResult(result);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  // Collect all processes from process maps
  const allProcesses: { id: number; name: string; mapName: string }[] = [];
  processMaps.forEach((pm) => {
    // We don't have processes here, so just show process maps
    allProcesses.push({ id: pm.id, name: pm.name, mapName: pm.name });
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListOrdered className="text-brand-600" size={24} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Procedimientos</h1>
            <p className="text-sm text-slate-500">Manual de procedimientos por proceso · M8+</p>
          </div>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          <Upload size={16} /> Importar DOCX
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Importar Procedimiento desde DOCX</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">ID del proceso</label>
              <input
                type="number"
                className="w-full rounded border px-2 py-1.5 text-sm"
                placeholder="ID del proceso"
                value={importProcess}
                onChange={(e) => setImportProcess(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">Obtén el ID del proceso desde el módulo de Procesos.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              className="mb-4 block w-full text-sm text-slate-600"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            {importResult && (
              <div className="mb-4 rounded bg-slate-50 p-3 text-xs text-slate-700">
                <p>Procedimiento creado: <strong>#{String(importResult.procedure_id)}</strong></p>
                <p>Pasos creados: <strong>{String(importResult.steps_created)}</strong></p>
                {Array.isArray(importResult.warnings) && importResult.warnings.length > 0 && (
                  <div className="mt-1 text-amber-700">
                    {(importResult.warnings as string[]).map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={!importFile || !importProcess || importing}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {importing ? "Importando..." : "Importar"}
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

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Cargando procedimientos...</div>
      ) : procedures.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <ListOrdered className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">No hay procedimientos registrados</p>
          <p className="mt-1 text-xs text-slate-400">Importa un DOCX de procedimiento para un proceso del mapa activo.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Proceso</th>
                <th className="px-4 py-3 text-center">Versión</th>
                <th className="px-4 py-3 text-center">Pasos</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {procedures.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.process_name}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{p.version}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {p.steps_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/procedimientos/${p.id}`)}
                      className="rounded bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                    >
                      Ver pasos
                    </button>
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
