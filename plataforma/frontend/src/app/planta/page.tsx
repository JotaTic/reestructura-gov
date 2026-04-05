"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Paginated, PayrollPlan } from "@/types";
import { GitCompare, Plus, Users2 } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function PlantaPage() {
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

  const [plans, setPlans] = useState<PayrollPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kind: "CURRENT" as "CURRENT" | "PROPOSED",
    structure: "GLOBAL" as "GLOBAL" | "STRUCTURAL",
    name: "",
    reference_date: new Date().toISOString().slice(0, 10),
    adopted_by: "",
  });

  const load = () => {
    setLoading(true);
    api
      .get<Paginated<PayrollPlan>>("/planes/", { page_size: 100 })
      .then((d) => setPlans(d.results))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, activeRestructuring.id, version]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post<PayrollPlan>("/planes/", {
      ...form,
      entity: activeEntity.id,
      restructuring: activeRestructuring.id,
    });
    setShowForm(false);
    setForm({ ...form, name: "", adopted_by: "" });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planta de Personal</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · {activeRestructuring.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/planta/comparar"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <GitCompare size={14} /> Comparar
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            <Plus size={16} /> Nueva planta
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Tipo *</label>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as "CURRENT" | "PROPOSED" })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="CURRENT">Planta actual</option>
              <option value="PROPOSED">Planta propuesta</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Estructura</label>
            <select
              value={form.structure}
              onChange={(e) => setForm({ ...form, structure: e.target.value as "GLOBAL" | "STRUCTURAL" })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="GLOBAL">Global (recomendada FP)</option>
              <option value="STRUCTURAL">Estructural</option>
            </select>
          </div>
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
          <div>
            <label className="block text-xs font-medium text-slate-700">Acto que la adopta</label>
            <input
              value={form.adopted_by}
              onChange={(e) => setForm({ ...form, adopted_by: e.target.value })}
              placeholder="Decreto 123 de 2024"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Nombre *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej.: Planta actual vigente al 2026"
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
      ) : plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <Users2 className="mx-auto text-slate-400" size={36} />
          <p className="mt-2 text-sm text-slate-600">
            Aún no hay plantas en esta reestructuración.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Estructura</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-right">Cargos</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{p.name}</td>
                  <td className="p-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                        (p.kind === "CURRENT" ? "bg-slate-200 text-slate-700" : "bg-brand-100 text-brand-800")
                      }
                    >
                      {p.kind_display}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{p.structure_display}</td>
                  <td className="p-3 text-slate-600">{p.reference_date}</td>
                  <td className="p-3 text-right tabular-nums">{p.positions_count}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/planta/${p.id}`}
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
