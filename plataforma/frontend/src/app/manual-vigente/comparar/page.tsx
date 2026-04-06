"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ManualCompareReport, Restructuring, Paginated } from "@/types";
import { ArrowLeft, FileStack } from "lucide-react";
import { useRouter } from "next/navigation";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function CompararManualPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const router = useRouter();
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const [restructurings, setRestructurings] = useState<Restructuring[]>([]);
  const [selectedRid, setSelectedRid] = useState<string>("");
  const [report, setReport] = useState<ManualCompareReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<Restructuring>>("/restructurings/", { page_size: 50 })
      .then((d) => setRestructurings(d.results))
      .catch(() => {
        // fallback — some setups use /reestructuraciones/
        api.get<Paginated<Restructuring>>("/reestructuraciones/", { page_size: 50 })
          .then((d) => setRestructurings(d.results))
          .catch(() => {});
      });
  }, [activeEntity.id]);

  const handleComparar = async () => {
    if (!selectedRid) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<ManualCompareReport>(
        `/manuales-vigentes/comparar/`,
        { restructuring: selectedRid }
      );
      setReport(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al comparar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft size={20} />
        </button>
        <FileStack className="text-brand-600" size={22} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Comparar Manual Vigente vs Propuesta</h1>
          <p className="text-sm text-slate-500">Identifica cargos añadidos, eliminados y modificados</p>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Reestructuración</label>
          <select
            className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={selectedRid}
            onChange={(e) => setSelectedRid(e.target.value)}
          >
            <option value="">Selecciona una reestructuración...</option>
            {restructurings.map((r) => (
              <option key={r.id} value={String(r.id)}>{r.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleComparar}
          disabled={!selectedRid || loading}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Comparando..." : "Comparar"}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {report && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Añadidos", count: report.stats.added, color: "text-green-700 bg-green-50" },
              { label: "Eliminados", count: report.stats.removed, color: "text-red-700 bg-red-50" },
              { label: "Modificados", count: report.stats.modified, color: "text-amber-700 bg-amber-50" },
              { label: "Sin cambios", count: report.stats.unchanged, color: "text-slate-700 bg-slate-50" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-4 text-center ${s.color}`}>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-green-700">Cargos añadidos ({report.added.length})</h3>
              {report.added.length === 0
                ? <p className="text-xs text-slate-400">Ninguno</p>
                : report.added.map((a, i) => (
                  <div key={i} className="mb-1 text-xs text-slate-700">
                    <strong>{a.code}-{a.grade}</strong> {a.denomination}
                  </div>
                ))}
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-red-700">Cargos eliminados ({report.removed.length})</h3>
              {report.removed.length === 0
                ? <p className="text-xs text-slate-400">Ninguno</p>
                : report.removed.map((r, i) => (
                  <div key={i} className="mb-1 text-xs text-slate-700">
                    <strong>{r.code}-{r.grade}</strong> {r.denomination}
                  </div>
                ))}
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-amber-700">Cargos modificados ({report.modified.length})</h3>
              {report.modified.length === 0
                ? <p className="text-xs text-slate-400">Ninguno</p>
                : report.modified.map((m, i) => (
                  <div key={i} className="mb-2 text-xs text-slate-700">
                    <strong>{m.code}-{m.grade}</strong> {m.denomination}
                    {m.diff && Object.entries(m.diff).map(([field, val]) => (
                      <div key={field} className="ml-2 text-amber-600">
                        {field}: &quot;{val.old}&quot; → &quot;{val.new}&quot;
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          {report.warnings && report.warnings.length > 0 && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              {report.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
