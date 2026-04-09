"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { Plus, Save, Trash2, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import type { Paginated } from "@/types";

interface Activity {
  id: number;
  entity: number;
  name: string;
  responsible: string;
  indicator: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  status_display: string;
  order: number;
  notes: string;
}

const STATUSES = [
  { value: "PENDING", label: "Pendiente", color: "bg-slate-100 text-slate-700" },
  { value: "IN_PROGRESS", label: "En progreso", color: "bg-blue-100 text-blue-700" },
  { value: "DONE", label: "Completada", color: "bg-emerald-100 text-emerald-700" },
  { value: "BLOCKED", label: "Bloqueada", color: "bg-red-100 text-red-700" },
];

export default function CronogramaPage() {
  return <RequireContext need="entity"><Inner /></RequireContext>;
}

function Inner() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", responsible: "", indicator: "", start_date: "", end_date: "", notes: "" });

  const load = () => {
    setLoading(true);
    api.get<Paginated<Activity>>("/cronograma/", { page_size: 200 })
      .then((d) => setActivities(d.results))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post("/cronograma/", { ...form, status: "PENDING", order: activities.length + 1 });
    setShowForm(false);
    setForm({ name: "", responsible: "", indicator: "", start_date: "", end_date: "", notes: "" });
    load();
  };

  const updateStatus = async (id: number, status: string) => {
    await api.patch(`/cronograma/${id}/`, { status });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar esta actividad?")) return;
    await api.delete(`/cronograma/${id}/`);
    load();
  };

  const doneCount = activities.filter((a) => a.status === "DONE").length;
  const pct = activities.length > 0 ? Math.round((doneCount / activities.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cronograma — Fase 1</h1>
          <p className="text-sm text-slate-600">Actividades del acuerdo inicial (Anexo 1 Cartilla FP).</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          <Plus size={16} /> Agregar actividad
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{doneCount}/{activities.length} completadas</span><span>{pct}%</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Actividad</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Indicador</th>
              <th className="px-4 py-3">Fechas</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acc.</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a, i) => {
              const st = STATUSES.find((s) => s.value === a.status);
              return (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{a.name}</td>
                  <td className="px-4 py-2 text-slate-600">{a.responsible || "—"}</td>
                  <td className="px-4 py-2 text-slate-600 text-xs">{a.indicator || "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{a.start_date || "—"} → {a.end_date || "—"}</td>
                  <td className="px-4 py-2">
                    <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)} className={`rounded-full px-2 py-0.5 text-xs font-semibold border-0 ${st?.color || ""}`}>
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2"><button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {activities.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay actividades. Agrega la primera.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Nueva actividad del cronograma</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-slate-700">Actividad</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700">Responsable</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700">Indicador</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.indicator} onChange={(e) => setForm({ ...form, indicator: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700">Fecha inicio</label><input type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700">Fecha fin</label><input type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={create} disabled={!form.name} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
