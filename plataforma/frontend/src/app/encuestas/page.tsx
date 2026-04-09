"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import {
  Plus,
  ClipboardList,
  Send,
  Lock,
  Unlock,
  Eye,
  Copy,
  CheckCircle,
  Users,
  BarChart3,
} from "lucide-react";
import type { Paginated, WorkloadMatrix } from "@/types";

interface Survey {
  id: number;
  entity: number;
  entity_name: string;
  matrix: number;
  matrix_name: string;
  name: string;
  description: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  deadline: string | null;
  participants_count: number;
  responses_count: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-slate-100 text-slate-700" },
  OPEN: { label: "Abierta", color: "bg-emerald-100 text-emerald-800" },
  CLOSED: { label: "Cerrada", color: "bg-red-100 text-red-700" },
};

export default function EncuestasPage() {
  return (
    <RequireContext need="restructuring">
      <EncuestasInner />
    </RequireContext>
  );
}

function EncuestasInner() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [matrices, setMatrices] = useState<WorkloadMatrix[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    name: "",
    matrix: "",
    deadline: "",
    description: "",
  });

  const load = async () => {
    const [s, m] = await Promise.all([
      api.get<Paginated<Survey>>("/encuestas/", { page_size: 100 }),
      api.get<Paginated<WorkloadMatrix>>("/matrices/", { page_size: 100 }),
    ]);
    setSurveys(s.results);
    setMatrices(m.results);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post("/encuestas/", {
      ...form,
      matrix: Number(form.matrix),
    });
    setShowForm(false);
    setForm({ name: "", matrix: "", deadline: "", description: "" });
    load();
  };

  const toggleStatus = async (survey: Survey) => {
    if (survey.status === "DRAFT" || survey.status === "CLOSED") {
      await api.post(`/encuestas/${survey.id}/abrir/`, {});
    } else {
      await api.post(`/encuestas/${survey.id}/cerrar/`, {});
    }
    load();
  };

  const consolidate = async (id: number) => {
    const result = await api.post<{ consolidated: number; errors: unknown[] }>(
      `/encuestas/${id}/consolidar/`,
      {}
    );
    alert(`Se consolidaron ${result.consolidated} actividad(es) en la matriz.`);
    load();
  };

  if (loading) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Encuestas de Cargas Laborales
          </h1>
          <p className="text-sm text-slate-600">
            Envía un link a funcionarios y contratistas para que registren sus
            actividades y tiempos.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          <Plus size={16} /> Nueva encuesta
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Encuesta</th>
              <th className="px-4 py-3">Matriz</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Participantes</th>
              <th className="px-4 py-3">Respuestas</th>
              <th className="px-4 py-3">Fecha límite</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((s) => {
              const st = STATUS_LABELS[s.status] || STATUS_LABELS.DRAFT;
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.matrix_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{s.participants_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        s.responses_count === s.participants_count && s.participants_count > 0
                          ? "font-semibold text-emerald-600"
                          : ""
                      }
                    >
                      {s.responses_count}/{s.participants_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.deadline || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Link
                        href={`/encuestas/${s.id}`}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        <Eye size={12} /> Gestionar
                      </Link>
                      <button
                        onClick={() => toggleStatus(s)}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                        title={s.status === "OPEN" ? "Cerrar" : "Abrir"}
                      >
                        {s.status === "OPEN" ? <Lock size={12} /> : <Unlock size={12} />}
                        {s.status === "OPEN" ? "Cerrar" : "Abrir"}
                      </button>
                      {s.responses_count > 0 && (
                        <button
                          onClick={() => consolidate(s.id)}
                          className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                        >
                          <BarChart3 size={12} /> Consolidar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {surveys.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No hay encuestas aún. Crea una para empezar a recolectar cargas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Nueva encuesta</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Levantamiento de cargas 2026"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Matriz de cargas vinculada
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.matrix}
                  onChange={(e) => setForm({ ...form, matrix: e.target.value })}
                  required
                >
                  <option value="">Seleccionar…</option>
                  {matrices.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Fecha límite
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Instrucciones para participantes
                </label>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Instrucciones que verá cada participante al abrir el link…"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={create}
                disabled={!form.name || !form.matrix}
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Crear encuesta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
