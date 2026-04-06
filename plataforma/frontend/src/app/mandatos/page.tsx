"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LegalMandate, MandateGapReport, Paginated } from "@/types";
import { Gavel, Plus } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function MandatosPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

const KIND_LABELS: Record<string, string> = {
  EJECUCION: "Ejecución",
  REGULACION: "Regulación",
  VIGILANCIA: "Vigilancia",
  FOMENTO: "Fomento",
  OTRO: "Otro",
};

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);

  const [mandates, setMandates] = useState<LegalMandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    norm: "", article: "", mandate_text: "", kind: "EJECUCION", is_constitutional: false,
  });
  const [saving, setSaving] = useState(false);

  // Gap report
  const [gapReport, setGapReport] = useState<MandateGapReport | null>(null);
  const [loadingGap, setLoadingGap] = useState(false);
  const [showGap, setShowGap] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<LegalMandate>>("/mandatos/", { page_size: 100 })
      .then((d) => setMandates(d.results))
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
      await api.post<LegalMandate>("/mandatos/", {
        entity: activeEntity.id,
        ...form,
      });
      setShowForm(false);
      setForm({ norm: "", article: "", mandate_text: "", kind: "EJECUCION", is_constitutional: false });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear mandato");
    } finally {
      setSaving(false);
    }
  };

  const handleGapReport = async () => {
    setLoadingGap(true);
    setShowGap(true);
    try {
      const result = await api.get<MandateGapReport>("/mandatos/brecha/");
      setGapReport(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar reporte");
    } finally {
      setLoadingGap(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gavel className="text-brand-600" size={24} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Mandatos Legales</h1>
            <p className="text-sm text-slate-500">Funciones mandatadas por norma · M18</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGapReport}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Reporte de brecha
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Nuevo mandato
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Nuevo Mandato Legal</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Norma</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm"
                value={form.norm}
                onChange={(e) => setForm({ ...form, norm: e.target.value })}
                placeholder="Ley 715/2001"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Artículo</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm"
                value={form.article}
                onChange={(e) => setForm({ ...form, article: e.target.value })}
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select
                className="w-full rounded border px-2 py-1.5 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 self-end">
              <input
                type="checkbox"
                id="is_const"
                checked={form.is_constitutional}
                onChange={(e) => setForm({ ...form, is_constitutional: e.target.checked })}
              />
              <label htmlFor="is_const" className="text-sm text-slate-700">¿Es constitucional?</label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Texto del mandato</label>
              <textarea
                className="w-full rounded border px-2 py-1.5 text-sm"
                rows={3}
                value={form.mandate_text}
                onChange={(e) => setForm({ ...form, mandate_text: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Crear mandato"}
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

      {/* Gap Report Modal */}
      {showGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Reporte de Brecha Mandatos-Procesos</h2>
              <button onClick={() => setShowGap(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            {loadingGap ? (
              <p className="text-sm text-slate-500">Calculando brecha...</p>
            ) : gapReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: "Plena", v: gapReport.coverage_stats.full, c: "text-green-700 bg-green-50" },
                    { label: "Parcial", v: gapReport.coverage_stats.partial, c: "text-amber-700 bg-amber-50" },
                    { label: "Ninguna", v: gapReport.coverage_stats.none, c: "text-red-700 bg-red-50" },
                    { label: "Sin registro", v: gapReport.coverage_stats.untracked, c: "text-slate-700 bg-slate-50" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-lg p-3 ${s.c}`}>
                      <p className="text-2xl font-bold">{s.v}</p>
                      <p className="text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">
                    Mandatos sin proceso ({gapReport.mandates_without_process.length})
                  </h3>
                  {gapReport.mandates_without_process.length === 0 ? (
                    <p className="text-xs text-slate-400">Todos los mandatos tienen proceso asignado.</p>
                  ) : (
                    <ul className="space-y-1">
                      {gapReport.mandates_without_process.map((m) => (
                        <li key={m.id} className="text-xs text-slate-700">
                          <strong>{m.norm}</strong>{m.article ? ` art. ${m.article}` : ""} — {m.mandate_text.slice(0, 80)}...
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-700 mb-2">
                    Procesos sin mandato ({gapReport.processes_without_mandate.length})
                  </h3>
                  {gapReport.processes_without_mandate.length === 0 ? (
                    <p className="text-xs text-slate-400">Todos los procesos tienen mandato vinculado.</p>
                  ) : (
                    <ul className="space-y-1">
                      {gapReport.processes_without_mandate.map((p) => (
                        <li key={p.id} className="text-xs text-slate-700">
                          {p.code} — <strong>{p.name}</strong> ({p.type})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Cargando mandatos...</div>
      ) : mandates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <Gavel className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">No hay mandatos legales registrados</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Norma</th>
                <th className="px-4 py-3 text-left">Art.</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Texto</th>
                <th className="px-4 py-3 text-center">Const.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mandates.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.norm}</td>
                  <td className="px-4 py-3 text-slate-500">{m.article || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {KIND_LABELS[m.kind] || m.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{m.mandate_text}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {m.is_constitutional ? "Sí" : "—"}
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
