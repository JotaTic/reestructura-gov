"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Paginated, ProcessMap, ProcessMapKind } from "@/types";
import { Network, Plus } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function ProcessMapsPage() {
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

  const [maps, setMaps] = useState<ProcessMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kind: "CURRENT" as ProcessMapKind,
    name: "",
    reference_date: new Date().toISOString().slice(0, 10),
  });

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<ProcessMap>>("/mapas-procesos/", { page_size: 100 })
      .then((d) => setMaps(d.results))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, activeRestructuring.id, version]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post<ProcessMap>("/mapas-procesos/", {
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
          <h1 className="text-2xl font-bold text-slate-900">Procesos y cadena de valor</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · {activeRestructuring.name}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          <Plus size={16} /> Nuevo mapa
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Tipo *</label>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as ProcessMapKind })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="CURRENT">Actual</option>
              <option value="PROPOSED">Propuesto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Fecha *</label>
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
              placeholder="Mapa de procesos vigente 2026"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              Crear
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : maps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <Network className="mx-auto text-slate-400" size={36} />
          <p className="mt-2 text-sm text-slate-600">
            Aún no hay mapas de procesos en esta reestructuración.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => (
            <Link
              key={m.id}
              href={`/procesos/${m.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-500 hover:shadow"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900">{m.name}</h3>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                    (m.kind === "CURRENT" ? "bg-slate-200 text-slate-700" : "bg-brand-100 text-brand-800")
                  }
                >
                  {m.kind_display}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Fecha {m.reference_date}</p>
              <div className="mt-2 flex gap-3 text-[11px] text-slate-600">
                <span>{m.processes_count} procesos</span>
                <span>{m.chain_count} eslabones</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
