"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { Plus, Trash2, ListTodo, CheckCircle, Clock, AlertCircle } from "lucide-react";
import type { Paginated } from "@/types";

interface Plan { id: number; restructuring: number; name: string; description: string; start_date: string | null; end_date: string | null; tasks_count: number; created_at: string; }
interface Task { id: number; plan: number; name: string; category: string; category_display: string; responsible: string; start_date: string | null; end_date: string | null; status: string; status_display: string; depends_on: number | null; notes: string; order: number; }

const STATUS_COLORS: Record<string, string> = { PENDING: "bg-slate-100 text-slate-700", IN_PROGRESS: "bg-blue-100 text-blue-700", COMPLETED: "bg-emerald-100 text-emerald-700", BLOCKED: "bg-red-100 text-red-700" };
const CATEGORIES = [
  { value: "NOTIFICACION", label: "Notificación" }, { value: "INCORPORACION", label: "Incorporación" },
  { value: "LIQUIDACION", label: "Liquidación" }, { value: "CONVOCATORIA", label: "Convocatoria CNSC" },
  { value: "REUBICACION", label: "Reubicación" }, { value: "SUPRESION", label: "Supresión" },
  { value: "ADMINISTRATIVO", label: "Administrativo" }, { value: "OTRO", label: "Otro" },
];
const STATUSES = [
  { value: "PENDING", label: "Pendiente" }, { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completada" }, { value: "BLOCKED", label: "Bloqueada" },
];

export default function ImplementacionPage() {
  return <RequireContext need="restructuring"><Inner /></RequireContext>;
}

function Inner() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [planName, setPlanName] = useState("");
  const [taskForm, setTaskForm] = useState({ name: "", category: "OTRO", responsible: "", start_date: "", end_date: "", status: "PENDING", notes: "" });

  const loadPlans = () => {
    setLoading(true);
    api.get<Paginated<Plan>>("/planes-implementacion/", { page_size: 50 }).then((d) => {
      setPlans(d.results);
      if (d.results.length > 0 && !activePlan) setActivePlan(d.results[0]);
    }).finally(() => setLoading(false));
  };

  const loadTasks = () => {
    if (!activePlan) return;
    api.get<Paginated<Task>>("/tareas-implementacion/", { plan: activePlan.id, page_size: 200 }).then((d) => setTasks(d.results));
  };

  useEffect(() => { loadPlans(); }, []);
  useEffect(() => { loadTasks(); }, [activePlan]);

  const createPlan = async () => {
    const p = await api.post<Plan>("/planes-implementacion/", { name: planName, description: "" });
    setPlans([p, ...plans]);
    setActivePlan(p);
    setShowPlanForm(false);
    setPlanName("");
  };

  const createTask = async () => {
    if (!activePlan) return;
    await api.post("/tareas-implementacion/", { plan: activePlan.id, ...taskForm, order: tasks.length + 1 });
    setShowTaskForm(false);
    setTaskForm({ name: "", category: "OTRO", responsible: "", start_date: "", end_date: "", status: "PENDING", notes: "" });
    loadTasks();
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    await api.patch(`/tareas-implementacion/${taskId}/`, { status });
    loadTasks();
  };

  const deleteTask = async (id: number) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    await api.delete(`/tareas-implementacion/${id}/`);
    loadTasks();
  };

  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan de Implementación</h1>
          <p className="text-sm text-slate-600">Tareas post-aprobación: notificaciones, incorporaciones, liquidaciones.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPlanForm(true)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"><Plus size={14} /> Nuevo plan</button>
          {activePlan && <button onClick={() => setShowTaskForm(true)} className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"><Plus size={16} /> Agregar tarea</button>}
        </div>
      </div>

      {/* Plan selector + progress */}
      {plans.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={activePlan?.id || ""} onChange={(e) => setActivePlan(plans.find((p) => p.id === Number(e.target.value)) || null)}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{completedCount}/{tasks.length} tareas</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Tasks table */}
      {activePlan && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{t.category_display}</span></td>
                  <td className="px-4 py-3 text-slate-600">{t.responsible || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.start_date || "—"} → {t.end_date || "—"}</td>
                  <td className="px-4 py-3">
                    <select value={t.status} onChange={(e) => updateTaskStatus(t.id, e.target.value)} className={`rounded-full px-2 py-0.5 text-xs font-semibold border-0 ${STATUS_COLORS[t.status] || ""}`}>
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><button onClick={() => deleteTask(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay tareas. Agrega la primera.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {plans.length === 0 && !loading && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <ListTodo size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">Crea un plan de implementación para organizar las tareas post-aprobación.</p>
        </div>
      )}

      {/* Modal plan */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Nuevo plan</h2>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre del plan" value={planName} onChange={(e) => setPlanName(e.target.value)} autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowPlanForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={createPlan} disabled={!planName} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal task */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Agregar tarea</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-slate-700">Tarea</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700">Categoría</label><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.category} onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700">Responsable</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.responsible} onChange={(e) => setTaskForm({ ...taskForm, responsible: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700">Fecha inicio</label><input type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.start_date} onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700">Fecha fin</label><input type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.end_date} onChange={(e) => setTaskForm({ ...taskForm, end_date: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700">Notas</label><textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowTaskForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={createTask} disabled={!taskForm.name} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
