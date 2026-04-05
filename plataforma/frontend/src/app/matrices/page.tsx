"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Paginated, WorkloadMatrix } from "@/types";
import { ListChecks, Plus } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import { ExportBar } from "@/components/ui/ExportBar";

export default function MatricesPage() {
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

  const [matrices, setMatrices] = useState<WorkloadMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    reference_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<WorkloadMatrix>>("/matrices/")
      .then((d) => setMatrices(d.results))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, activeRestructuring.id, version]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post<WorkloadMatrix>("/matrices/", {
      ...form,
      entity: activeEntity.id,
      restructuring: activeRestructuring.id,
    });
    setShowForm(false);
    setForm({ ...form, name: "", notes: "" });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Matrices de Cargas de Trabajo</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · {activeRestructuring.name}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ExportBar />
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-800"
          >
            <Plus size={16} /> Nueva matriz
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2"
        >
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
            <label className="block text-xs font-medium text-slate-700">Nombre del estudio *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej.: Levantamiento de cargas 2026"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              Crear matriz
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : matrices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <ListChecks className="mx-auto text-slate-400" size={36} />
          <p className="mt-2 text-sm text-slate-600">
            Aún no hay matrices en esta reestructuración.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3 text-left">Estudio</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-right">Actividades</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {matrices.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{m.name}</td>
                  <td className="p-3 text-slate-600">{m.reference_date}</td>
                  <td className="p-3 text-right tabular-nums">{m.entries_count}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/matrices/${m.id}`}
                      className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                    >
                      Abrir
                    </Link>
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
