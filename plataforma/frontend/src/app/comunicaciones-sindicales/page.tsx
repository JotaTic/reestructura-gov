"use client";

import { useEffect, useState } from "react";
import { Mail, Plus, X, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import type { UnionCommunication, Paginated } from "@/types";

export default function ComunicacionesSindicalesPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const activeRestructuring = useContextStore((s) => s.activeRestructuring)!;

  const [comms, setComms] = useState<UnionCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "responded">("all");

  const [form, setForm] = useState({
    union_name: "",
    sent_at: new Date().toISOString().slice(0, 10),
    subject: "",
    body: "",
    response_received: false,
    response_notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<UnionCommunication>>(
        "/comunicaciones-sindicales/",
        { page_size: 100 }
      );
      setComms(data.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, activeRestructuring.id]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post("/comunicaciones-sindicales/", form);
      setShowForm(false);
      setForm({
        union_name: "",
        sent_at: new Date().toISOString().slice(0, 10),
        subject: "",
        body: "",
        response_received: false,
        response_notes: "",
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear comunicado");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleResponse = async (comm: UnionCommunication) => {
    try {
      await api.patch(`/comunicaciones-sindicales/${comm.id}/`, {
        response_received: !comm.response_received,
      });
      setComms((prev) =>
        prev.map((c) =>
          c.id === comm.id
            ? { ...c, response_received: !c.response_received }
            : c
        )
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    }
  };

  const handleUpdateNotes = async (commId: number, notes: string) => {
    try {
      await api.patch(`/comunicaciones-sindicales/${commId}/`, {
        response_notes: notes,
      });
      setComms((prev) =>
        prev.map((c) =>
          c.id === commId ? { ...c, response_notes: notes } : c
        )
      );
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (commId: number) => {
    if (!confirm("¿Eliminar esta comunicacion sindical?")) return;
    try {
      await api.delete(`/comunicaciones-sindicales/${commId}/`);
      setComms((prev) => prev.filter((c) => c.id !== commId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const filtered = comms.filter((c) => {
    if (filter === "pending") return !c.response_received;
    if (filter === "responded") return c.response_received;
    return true;
  });

  const pendingCount = comms.filter((c) => !c.response_received).length;
  const respondedCount = comms.filter((c) => c.response_received).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="text-brand-600" size={24} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Comunicaciones Sindicales
            </h1>
            <p className="text-sm text-slate-500">
              {activeRestructuring.name} — {activeEntity.name}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          <Plus size={16} /> Nuevo comunicado
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{comms.length}</p>
          <p className="text-xs text-slate-500">Total comunicaciones</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600">Pendientes de respuesta</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{respondedCount}</p>
          <p className="text-xs text-emerald-600">Con respuesta</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {([
          { key: "all", label: `Todos (${comms.length})` },
          { key: "pending", label: `Pendientes (${pendingCount})` },
          { key: "responded", label: `Respondidos (${respondedCount})` },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors " +
              (filter === f.key
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">
          Cargando comunicaciones...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Mail className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="text-sm font-medium text-slate-600">
            {filter === "all"
              ? "No hay comunicaciones sindicales registradas"
              : filter === "pending"
              ? "No hay comunicaciones pendientes"
              : "No hay comunicaciones respondidas"}
          </p>
          {filter === "all" && (
            <p className="mt-1 text-xs text-slate-400">
              Registra las comunicaciones enviadas a organizaciones sindicales durante el proceso de reestructuracion.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className="flex cursor-pointer items-center gap-3 px-5 py-4"
                onClick={() =>
                  setExpandedId(expandedId === c.id ? null : c.id)
                }
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    c.response_received
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {c.response_received ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Clock size={16} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {c.union_name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.response_received
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.response_received ? "Respondido" : "Pendiente"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">
                    {c.subject}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {c.sent_at}
                </span>
              </div>

              {expandedId === c.id && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                  {c.body && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                        Contenido
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {c.body}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleResponse(c)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        c.response_received
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {c.response_received
                        ? "Marcar como pendiente"
                        : "Marcar como respondido"}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                      Notas de respuesta
                    </p>
                    <textarea
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      rows={2}
                      defaultValue={c.response_notes}
                      onBlur={(e) =>
                        handleUpdateNotes(c.id, e.target.value)
                      }
                      placeholder="Agregar notas sobre la respuesta recibida..."
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Nueva comunicacion sindical
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500">
                  Organizacion sindical *
                </label>
                <input
                  value={form.union_name}
                  onChange={(e) =>
                    setForm({ ...form, union_name: e.target.value })
                  }
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="Sindicato de empleados municipales"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500">
                    Fecha de envio *
                  </label>
                  <input
                    type="date"
                    value={form.sent_at}
                    onChange={(e) =>
                      setForm({ ...form, sent_at: e.target.value })
                    }
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <input
                    type="checkbox"
                    id="resp_recv"
                    checked={form.response_received}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        response_received: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="resp_recv" className="text-sm text-slate-700">
                    Respuesta recibida
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Asunto *</label>
                <input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="Comunicado sobre proceso de reestructuracion"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">
                  Cuerpo del comunicado
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) =>
                    setForm({ ...form, body: e.target.value })
                  }
                  rows={4}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              {form.response_received && (
                <div>
                  <label className="text-[11px] text-slate-500">
                    Notas de la respuesta
                  </label>
                  <textarea
                    value={form.response_notes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        response_notes: e.target.value,
                      })
                    }
                    rows={2}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !form.union_name || !form.subject || !form.sent_at || saving
                }
                className="rounded bg-brand-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Crear comunicado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
