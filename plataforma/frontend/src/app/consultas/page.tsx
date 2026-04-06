"use client";

import { useEffect, useState } from "react";
import { Mail, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import type { OfficialConsultation, ConsultationTarget, ConsultationResult, Paginated } from "@/types";

const TARGET_LABELS: Record<ConsultationTarget, string> = {
  DAFP: "Función Pública (DAFP)",
  MINHACIENDA: "MinHacienda",
  MINTRABAJO: "MinTrabajo",
  CNSC: "CNSC",
  CONTRALORIA: "Contraloría",
  PERSONERIA: "Personería",
  OTRO: "Otro",
};

const RESULT_LABELS: Record<ConsultationResult, string> = {
  PENDIENTE: "Pendiente",
  FAVORABLE: "Favorable",
  NO_FAVORABLE: "No favorable",
  CON_OBSERVACIONES: "Con observaciones",
};

const RESULT_COLORS: Record<ConsultationResult, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  FAVORABLE: "bg-emerald-100 text-emerald-700",
  NO_FAVORABLE: "bg-red-100 text-red-700",
  CON_OBSERVACIONES: "bg-blue-100 text-blue-700",
};

function expirationColor(days: number | null): string {
  if (days === null) return "";
  if (days > 25) return "bg-red-50";
  if (days >= 15) return "bg-yellow-50";
  return "bg-emerald-50";
}

const emptyForm = {
  entity_target: "DAFP" as ConsultationTarget,
  subject: "",
  sent_at: "",
  reference_number: "",
  notes: "",
};

const emptyResponse = {
  response_at: "",
  response_result: "FAVORABLE" as ConsultationResult,
  notes: "",
};

export default function ConsultasPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const version = useContextStore((s) => s.version);
  const [items, setItems] = useState<OfficialConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseForm, setResponseForm] = useState(emptyResponse);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<OfficialConsultation>>("/consultas/");
      setItems(data.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [version]);

  const handleCreate = async () => {
    setError(null);
    try {
      await api.post("/consultas/", {
        entity_target: form.entity_target,
        subject: form.subject,
        sent_at: form.sent_at || null,
        reference_number: form.reference_number,
        notes: form.notes,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear");
    }
  };

  const handleRespond = async (id: number) => {
    setError(null);
    try {
      await api.patch(`/consultas/${id}/`, {
        response_at: responseForm.response_at || null,
        response_result: responseForm.response_result,
        notes: responseForm.notes,
      });
      setRespondingId(null);
      setResponseForm(emptyResponse);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta consulta?")) return;
    await api.delete(`/consultas/${id}/`);
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="text-brand-700" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Consultas Oficiales</h1>
            <p className="text-sm text-slate-600">Seguimiento de consultas a organismos externos.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
        >
          <Plus size={14} /> Nueva consulta
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Formulario de creación */}
      {showForm && (
        <div className="rounded-xl border border-brand-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Nueva consulta</h2>
            <button onClick={() => setShowForm(false)}>
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500">Organismo</label>
              <select
                value={form.entity_target}
                onChange={(e) => setForm({ ...form, entity_target: e.target.value as ConsultationTarget })}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                {Object.entries(TARGET_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Fecha de envío</label>
              <input
                type="date"
                value={form.sent_at}
                onChange={(e) => setForm({ ...form, sent_at: e.target.value })}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-slate-500">Asunto *</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="Descripción del asunto"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Número de radicado</label>
              <input
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Notas</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.subject}
              className="rounded bg-brand-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              Crear consulta
            </button>
          </div>
        </div>
      )}

      {/* Tabla de consultas */}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay consultas registradas.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Organismo</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Asunto</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Enviada</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Días restantes</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c) => (
                <tr key={c.id} className={expirationColor(c.days_until_expiration)}>
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {TARGET_LABELS[c.entity_target] ?? c.entity_target}
                  </td>
                  <td className="px-4 py-2 text-slate-700 max-w-[200px] truncate" title={c.subject}>
                    {c.subject}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{c.sent_at ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RESULT_COLORS[c.response_result]}`}>
                      {RESULT_LABELS[c.response_result]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {c.days_until_expiration !== null ? (
                      <span className={c.days_until_expiration < 0 ? "text-red-600 font-semibold" : ""}>
                        {c.days_until_expiration < 0
                          ? `Vencida (${Math.abs(c.days_until_expiration)} días)`
                          : `${c.days_until_expiration} días`}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {c.response_result === "PENDIENTE" && (
                        <button
                          onClick={() => {
                            setRespondingId(c.id);
                            setResponseForm(emptyResponse);
                          }}
                          className="rounded bg-brand-100 px-2 py-0.5 text-[10px] text-brand-700 hover:bg-brand-200"
                        >
                          Registrar respuesta
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal respuesta */}
      {respondingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Registrar respuesta</h3>
              <button onClick={() => setRespondingId(null)}>
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500">Fecha de respuesta *</label>
                <input
                  type="date"
                  value={responseForm.response_at}
                  onChange={(e) => setResponseForm({ ...responseForm, response_at: e.target.value })}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Resultado *</label>
                <select
                  value={responseForm.response_result}
                  onChange={(e) => setResponseForm({ ...responseForm, response_result: e.target.value as ConsultationResult })}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  {Object.entries(RESULT_LABELS).filter(([k]) => k !== "PENDIENTE").map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Notas</label>
                <textarea
                  value={responseForm.notes}
                  onChange={(e) => setResponseForm({ ...responseForm, notes: e.target.value })}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRespondingId(null)}
                className="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRespond(respondingId)}
                disabled={!responseForm.response_at}
                className="rounded bg-brand-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Guardar respuesta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
