"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import {
  ArrowLeft,
  Plus,
  Copy,
  CheckCircle,
  Send,
  Users,
  Trash2,
  Check,
  X,
} from "lucide-react";
import type { Paginated, Department } from "@/types";

interface Participant {
  id: number;
  survey: number;
  token: string;
  full_name: string;
  id_number: string;
  email: string;
  phone: string;
  link_type: string;
  link_type_display: string;
  department: number;
  department_name: string;
  contract_number: string;
  contract_object: string;
  contract_supervisor: string;
  contract_start: string | null;
  contract_end: string | null;
  job_denomination: string;
  job_code: string;
  job_grade: string;
  submitted: boolean;
  submitted_at: string | null;
  activities_count: number;
  survey_url: string;
  is_contractor: boolean;
}

interface SurveySummaryParticipant {
  participant_id: number;
  full_name: string;
  link_type: string;
  link_type_display: string;
  department_name: string;
  is_contractor: boolean;
  submitted: boolean;
  activities_count: number;
  total_hh_month: number;
  core_activities: number;
  activities: {
    id: number;
    process: string;
    activity: string;
    monthly_frequency: string;
    standard_time: string;
    hh_month: string;
    is_core_activity: boolean;
    approved: boolean;
  }[];
}

interface SurveySummary {
  survey_id: number;
  survey_name: string;
  total_participants: number;
  submitted_count: number;
  participants: SurveySummaryParticipant[];
}

const LINK_TYPES = [
  { value: "CARRERA", label: "Carrera administrativa" },
  { value: "LNR", label: "Libre nombramiento y remoción" },
  { value: "PROVISIONAL", label: "Provisional" },
  { value: "TEMPORAL", label: "Temporal" },
  { value: "OPS", label: "OPS" },
  { value: "CPS", label: "CPS" },
  { value: "OTRO", label: "Otro" },
];

export default function SurveyDetailPage() {
  return (
    <RequireContext need="restructuring">
      <SurveyDetailInner />
    </RequireContext>
  );
}

function SurveyDetailInner() {
  const { id } = useParams<{ id: string }>();
  const surveyId = Number(id);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: "",
    id_number: "",
    email: "",
    phone: "",
    link_type: "CARRERA",
    department: "",
    contract_number: "",
    contract_object: "",
    contract_supervisor: "",
    contract_start: "",
    contract_end: "",
    job_denomination: "",
    job_code: "",
    job_grade: "",
  });

  const isContractorType = form.link_type === "OPS" || form.link_type === "CPS";

  const load = async () => {
    const [p, d] = await Promise.all([
      api.get<Paginated<Participant>>("/encuesta-participantes/", {
        survey: surveyId,
        page_size: 500,
      }),
      api.get<Paginated<Department>>("/dependencias/", { page_size: 200 }),
    ]);
    setParticipants(p.results);
    setDepartments(d.results);
    setLoading(false);
  };

  const loadSummary = async () => {
    const s = await api.get<SurveySummary>(`/encuestas/${surveyId}/resumen/`);
    setSummary(s);
    setShowSummary(true);
  };

  useEffect(() => { load(); }, []);

  const addParticipant = async () => {
    await api.post("/encuesta-participantes/", {
      survey: surveyId,
      ...form,
      department: Number(form.department),
    });
    setShowForm(false);
    setForm({
      full_name: "", id_number: "", email: "", phone: "",
      link_type: "CARRERA", department: "",
      contract_number: "", contract_object: "", contract_supervisor: "",
      contract_start: "", contract_end: "",
      job_denomination: "", job_code: "", job_grade: "",
    });
    load();
  };

  const deleteParticipant = async (pid: number) => {
    if (!confirm("¿Eliminar este participante?")) return;
    await api.delete(`/encuesta-participantes/${pid}/`);
    load();
  };

  const copyLink = (p: Participant) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${base}/encuesta/${p.token}`);
    setCopied(p.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const approveActivity = async (actId: number) => {
    await api.post("/encuesta-actividades/aprobar-bulk/", { ids: [actId] });
    loadSummary();
  };

  if (loading) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/encuestas" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            Participantes de la encuesta
          </h1>
          <p className="text-sm text-slate-600">
            Agrega participantes y comparte el link para que llenen sus cargas.
          </p>
        </div>
        <button
          onClick={loadSummary}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
        >
          <Users size={14} /> Ver respuestas
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          <Plus size={16} /> Agregar participante
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Cédula</th>
              <th className="px-4 py-3">Vinculación</th>
              <th className="px-4 py-3">Dependencia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Actividades</th>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {p.full_name}
                  {p.is_contractor && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      {p.link_type}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.id_number}</td>
                <td className="px-4 py-3 text-slate-600">{p.link_type_display}</td>
                <td className="px-4 py-3 text-slate-600">{p.department_name}</td>
                <td className="px-4 py-3">
                  {p.submitted ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle size={14} /> Respondida
                    </span>
                  ) : (
                    <span className="text-slate-400">Pendiente</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">{p.activities_count}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => copyLink(p)}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    {copied === p.id ? (
                      <>
                        <CheckCircle size={12} className="text-emerald-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copiar link
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteParticipant(p.id)}
                    className="text-red-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No hay participantes. Agrega funcionarios y contratistas para
                  compartirles el link.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal agregar participante */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              Agregar participante
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Tipo de vinculación
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.link_type}
                  onChange={(e) =>
                    setForm({ ...form, link_type: e.target.value })
                  }
                >
                  {LINK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Cédula
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.id_number}
                  onChange={(e) =>
                    setForm({ ...form, id_number: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Teléfono
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Dependencia
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccionar…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campos para funcionarios de planta */}
              {!isContractorType && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Denominación del empleo
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.job_denomination}
                      onChange={(e) =>
                        setForm({ ...form, job_denomination: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Código
                      </label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={form.job_code}
                        onChange={(e) =>
                          setForm({ ...form, job_code: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Grado
                      </label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={form.job_grade}
                        onChange={(e) =>
                          setForm({ ...form, job_grade: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Campos para OPS/CPS */}
              {isContractorType && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Número de contrato
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.contract_number}
                      onChange={(e) =>
                        setForm({ ...form, contract_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Supervisor
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.contract_supervisor}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contract_supervisor: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Objeto del contrato
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      rows={2}
                      value={form.contract_object}
                      onChange={(e) =>
                        setForm({ ...form, contract_object: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Fecha inicio contrato
                    </label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.contract_start}
                      onChange={(e) =>
                        setForm({ ...form, contract_start: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Fecha fin contrato
                    </label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.contract_end}
                      onChange={(e) =>
                        setForm({ ...form, contract_end: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={addParticipant}
                disabled={!form.full_name || !form.id_number || !form.department}
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resumen de respuestas */}
      {showSummary && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Respuestas ({summary.submitted_count}/{summary.total_participants})
              </h2>
              <button onClick={() => setShowSummary(false)}>
                <X size={20} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            {summary.participants.map((p) => (
              <div key={p.participant_id} className="mb-4 rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <span className="font-semibold text-slate-900">
                    {p.full_name}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {p.link_type_display}
                  </span>
                  <span className="text-xs text-slate-500">
                    {p.department_name}
                  </span>
                  {p.is_contractor && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Contratista
                    </span>
                  )}
                  {!p.submitted && (
                    <span className="text-xs text-slate-400">No ha respondido</span>
                  )}
                  {p.submitted && (
                    <span className="text-xs font-medium text-emerald-600">
                      {p.activities_count} actividades · {p.total_hh_month} HH/mes
                    </span>
                  )}
                </div>
                {p.activities.length > 0 && (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-2 py-1.5">Proceso</th>
                        <th className="px-2 py-1.5">Actividad</th>
                        <th className="px-2 py-1.5">Freq/mes</th>
                        <th className="px-2 py-1.5">TE (h)</th>
                        <th className="px-2 py-1.5">HH/mes</th>
                        <th className="px-2 py-1.5">Misional</th>
                        <th className="px-2 py-1.5">Aprobar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.activities.map((a) => (
                        <tr key={a.id} className="border-t border-slate-100">
                          <td className="px-2 py-1.5">{a.process}</td>
                          <td className="px-2 py-1.5">{a.activity}</td>
                          <td className="px-2 py-1.5 text-right">
                            {Number(a.monthly_frequency).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {Number(a.standard_time).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium">
                            {Number(a.hh_month).toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {a.is_core_activity ? (
                              <span className="text-amber-600">Sí</span>
                            ) : (
                              <span className="text-slate-400">No</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {a.approved ? (
                              <CheckCircle size={14} className="mx-auto text-emerald-500" />
                            ) : (
                              <button
                                onClick={() => approveActivity(a.id)}
                                className="mx-auto rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-100"
                              >
                                Aprobar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
