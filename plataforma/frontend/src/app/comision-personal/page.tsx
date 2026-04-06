"use client";

import { useEffect, useState } from "react";
import { Users, Plus, ChevronDown, ChevronRight, X } from "lucide-react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import type { PersonnelCommittee, CommitteeMeeting, Paginated } from "@/types";

export default function ComisionPersonalPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const version = useContextStore((s) => s.version);
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);
  const [committees, setCommittees] = useState<PersonnelCommittee[]>([]);
  const [meetings, setMeetings] = useState<CommitteeMeeting[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [committeeForm, setCommitteeForm] = useState({ name: "Comisión de Personal" });
  const [meetingForm, setMeetingForm] = useState({
    committee: 0,
    date: "",
    agenda: "",
    minutes_text: "",
  });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<PersonnelCommittee>>("/comision-personal/");
      setCommittees(data.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  const loadMeetings = async (committeeId: number) => {
    try {
      const data = await api.get<Paginated<CommitteeMeeting>>(
        `/comision-reuniones/?committee=${committeeId}`
      );
      setMeetings(data.results);
    } catch {
      // ignore
    }
  };

  useEffect(() => { load(); }, [version]);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      await loadMeetings(id);
    }
  };

  const handleCreateCommittee = async () => {
    setError(null);
    try {
      await api.post("/comision-personal/", { name: committeeForm.name });
      setCommitteeForm({ name: "Comisión de Personal" });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear");
    }
  };

  const handleCreateMeeting = async () => {
    setError(null);
    try {
      await api.post("/comision-reuniones/", {
        committee: meetingForm.committee,
        restructuring: activeRestructuring?.id ?? null,
        date: meetingForm.date,
        agenda: meetingForm.agenda,
        minutes_text: meetingForm.minutes_text,
      });
      setMeetingForm({ committee: 0, date: "", agenda: "", minutes_text: "" });
      setShowMeetingForm(false);
      if (expandedId) await loadMeetings(expandedId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear reunión");
    }
  };

  const handleDeleteCommittee = async (id: number) => {
    if (!confirm("¿Eliminar esta comisión?")) return;
    await api.delete(`/comision-personal/${id}/`);
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-brand-700" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Comisión de Personal</h1>
            <p className="text-sm text-slate-600">Gestión de la Comisión de Personal y sus reuniones (Ley 909/2004).</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
        >
          <Plus size={14} /> Nueva comisión
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Formulario nueva comisión */}
      {showForm && (
        <div className="rounded-xl border border-brand-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Nueva comisión de personal</h2>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-slate-400" /></button>
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Nombre</label>
            <input
              value={committeeForm.name}
              onChange={(e) => setCommitteeForm({ ...committeeForm, name: e.target.value })}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              onClick={handleCreateCommittee}
              disabled={!committeeForm.name}
              className="rounded bg-brand-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Lista de comisiones */}
      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : committees.length === 0 ? (
        <p className="text-sm text-slate-500">No hay comisiones registradas. Crea la primera.</p>
      ) : (
        <div className="space-y-3">
          {committees.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50"
                onClick={() => toggleExpand(c.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedId === c.id ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                  <span className="text-[11px] text-slate-400">{c.meetings_count} reuniones</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMeetingForm({ ...meetingForm, committee: c.id });
                      setShowMeetingForm(true);
                    }}
                    className="rounded bg-brand-100 px-2 py-0.5 text-[10px] text-brand-700 hover:bg-brand-200"
                  >
                    + Reunión
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCommittee(c.id);
                    }}
                    className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-100"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {expandedId === c.id && (
                <div className="border-t border-slate-100 px-5 py-3">
                  {/* Miembros */}
                  {c.members_json.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 text-[11px] font-semibold text-slate-500 uppercase">Miembros</p>
                      <div className="flex flex-wrap gap-2">
                        {c.members_json.map((m, i) => (
                          <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                            {m.name} · {m.role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reuniones */}
                  <p className="mb-2 text-[11px] font-semibold text-slate-500 uppercase">Reuniones</p>
                  {meetings.filter((m) => m.committee === c.id).length === 0 ? (
                    <p className="text-xs text-slate-400">Sin reuniones registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {meetings
                        .filter((m) => m.committee === c.id)
                        .map((mtg) => (
                          <div key={mtg.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-700">{mtg.date}</p>
                              {mtg.restructuring && (
                                <span className="text-[10px] bg-brand-100 text-brand-700 rounded px-2 py-0.5">
                                  Restr. #{mtg.restructuring}
                                </span>
                              )}
                            </div>
                            {mtg.agenda && (
                              <p className="mt-1 text-[11px] text-slate-600">
                                <span className="font-medium">Orden del día:</span> {mtg.agenda}
                              </p>
                            )}
                            {mtg.minutes_text && (
                              <p className="mt-1 text-[11px] text-slate-500">{mtg.minutes_text.slice(0, 150)}{mtg.minutes_text.length > 150 ? "…" : ""}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva reunión */}
      {showMeetingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Nueva reunión</h3>
              <button onClick={() => setShowMeetingForm(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500">Fecha *</label>
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Orden del día</label>
                <textarea
                  value={meetingForm.agenda}
                  onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Acta (texto)</label>
                <textarea
                  value={meetingForm.minutes_text}
                  onChange={(e) => setMeetingForm({ ...meetingForm, minutes_text: e.target.value })}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  rows={3}
                />
              </div>
              {activeRestructuring && (
                <p className="text-[11px] text-slate-400">
                  Se vinculará a: <strong>{activeRestructuring.name}</strong>
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowMeetingForm(false)}
                className="rounded px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={!meetingForm.date || !meetingForm.committee}
                className="rounded bg-brand-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Crear reunión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
