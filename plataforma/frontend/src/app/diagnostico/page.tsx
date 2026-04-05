"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Diagnosis, Paginated } from "@/types";
import { Brain, Plus } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import { ExportBar } from "@/components/ui/ExportBar";

export default function DiagnosticoListPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const activeRestructuring = useContextStore((s) => s.activeRestructuring)!;
  const version = useContextStore((s) => s.version);

  const [items, setItems] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    reference_date: new Date().toISOString().slice(0, 10),
  });

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<Diagnosis>>("/diagnosticos/", { page_size: 100 })
      .then((d) => setItems(d.results))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, activeRestructuring.id, version]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post<Diagnosis>("/diagnosticos/", {
      ...form,
      entity: activeEntity.id,
      restructuring: activeRestructuring.id,
    });
    setShowForm(false);
    setForm({ ...form, name: "" });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Diagnóstico institucional</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · {activeRestructuring.name}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ExportBar />
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            <Plus size={16} /> Nuevo diagnóstico
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Fecha de referencia *</label>
            <input
              required
              type="date"
              value={form.reference_date}
              onChange={(e) => setForm({ ...form, reference_date: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Nombre *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej.: Diagnóstico 2026 – rediseño institucional"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              Crear
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <Brain className="mx-auto text-slate-400" size={36} />
          <p className="mt-2 text-sm text-slate-600">
            Aún no hay diagnósticos en esta reestructuración.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <Link
              key={d.id}
              href={`/diagnostico/${d.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-500 hover:shadow"
            >
              <h3 className="font-semibold text-slate-900">{d.name}</h3>
              <p className="mt-1 text-xs text-slate-400">Fecha {d.reference_date}</p>
              <div className="mt-2 flex gap-3 text-[11px] text-slate-600">
                <span>DOFA: {d.swot_count}</span>
                <span>Legal: {d.legal_count}</span>
                <span>Entornos: {d.env_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
