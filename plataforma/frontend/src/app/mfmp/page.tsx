"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { MFMP, Paginated } from "@/types";
import { Plus, TrendingUp } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function MFMPPage() {
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
  const [mfmps, setMfmps] = useState<MFMP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", base_year: new Date().getFullYear(), horizon_years: 10 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<MFMP>>("/mfmp/", { page_size: 50 })
      .then((d) => setMfmps(d.results))
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
      const created = await api.post<MFMP>("/mfmp/", {
        entity: activeEntity.id,
        name: form.name,
        base_year: form.base_year,
        horizon_years: form.horizon_years,
      });
      setShowForm(false);
      router.push(`/mfmp/${created.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear MFMP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-brand-600" size={24} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">MFMP — Marco Fiscal de Mediano Plazo</h1>
            <p className="text-sm text-slate-500">Ley 819/2003 · Módulo 17</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nuevo MFMP
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Nuevo MFMP</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="MFMP 2026–2035"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Año base</label>
              <input
                type="number"
                className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.base_year}
                onChange={(e) => setForm({ ...form, base_year: +e.target.value })}
                min={2000}
                max={2100}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Horizonte (años)</label>
              <input
                type="number"
                className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.horizon_years}
                onChange={(e) => setForm({ ...form, horizon_years: +e.target.value })}
                min={1}
                max={20}
                required
              />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Crear MFMP"}
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

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Cargando MFMPs...</div>
      ) : mfmps.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <TrendingUp className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">No hay MFMPs registrados</p>
          <p className="mt-1 text-xs text-slate-400">
            Haz clic en «Nuevo MFMP» para crear el Marco Fiscal de Mediano Plazo de la entidad.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-center">Año base</th>
                <th className="px-4 py-3 text-center">Horizonte</th>
                <th className="px-4 py-3 text-left">Aprobado por</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mfmps.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-center">{m.base_year}</td>
                  <td className="px-4 py-3 text-center">{m.horizon_years} años</td>
                  <td className="px-4 py-3 text-slate-500">{m.approved_by || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/mfmp/${m.id}`)}
                      className="rounded bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                    >
                      Ver detalle
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
