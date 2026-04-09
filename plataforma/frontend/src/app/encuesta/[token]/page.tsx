"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Trash2,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface SurveyInfo {
  full_name: string;
  link_type: string;
  department: number;
  department_name: string;
  job_denomination: string;
  contract_number: string;
  contract_object: string;
  submitted: boolean;
  entity_name: string;
  survey_name: string;
  survey_description: string;
  survey_deadline: string | null;
  survey_active: boolean;
  departments: { id: number; name: string }[];
  activities: {
    id: number;
    process: string;
    activity: string;
    monthly_frequency: string;
    t_min: string;
    t_usual: string;
    t_max: string;
    standard_time: string;
    hh_month: string;
    is_core_activity: boolean;
  }[];
}

interface ActivityRow {
  process: string;
  activity: string;
  procedure: string;
  hierarchy_level: string;
  monthly_frequency: string;
  t_min: string;
  t_usual: string;
  t_max: string;
  is_core_activity: boolean;
  should_be_in_plant: boolean | null;
  observations: string;
}

const EMPTY_ROW: ActivityRow = {
  process: "",
  activity: "",
  procedure: "",
  hierarchy_level: "",
  monthly_frequency: "",
  t_min: "",
  t_usual: "",
  t_max: "",
  is_core_activity: false,
  should_be_in_plant: null,
  observations: "",
};

const LEVELS = [
  { value: "", label: "— Seleccionar —" },
  { value: "ASESOR", label: "Asesor" },
  { value: "PROFESIONAL", label: "Profesional" },
  { value: "TECNICO", label: "Técnico" },
  { value: "ASISTENCIAL", label: "Asistencial" },
];

const FREQ_HINTS = [
  { label: "Diaria", value: "20" },
  { label: "Semanal", value: "4" },
  { label: "Quincenal", value: "2" },
  { label: "Mensual", value: "1" },
  { label: "Trimestral", value: "0.3333" },
  { label: "Semestral", value: "0.1667" },
  { label: "Anual", value: "0.0833" },
];

export default function PublicSurveyPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo] = useState<SurveyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [rows, setRows] = useState<ActivityRow[]>([{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/publico/encuesta/${token}/`)
      .then(async (res) => {
        if (res.status === 410) {
          setClosed(true);
          return null;
        }
        if (!res.ok) throw new Error("Enlace no válido");
        return res.json();
      })
      .then((data) => {
        if (data) {
          setInfo(data);
          if (data.submitted) setSubmitted(true);
        }
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const addRow = () => setRows([...rows, { ...EMPTY_ROW }]);
  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, field: keyof ActivityRow, value: unknown) => {
    const updated = [...rows];
    (updated[i] as unknown as Record<string, unknown>)[field] = value;
    setRows(updated);
  };

  const submit = async () => {
    const valid = rows.filter(
      (r) => r.activity && r.monthly_frequency && r.t_min && r.t_usual && r.t_max
    );
    if (valid.length === 0) {
      alert("Debes registrar al menos una actividad completa.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/publico/encuesta/${token}/enviar/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: valid.map((r) => ({
            ...r,
            monthly_frequency: Number(r.monthly_frequency),
            t_min: Number(r.t_min),
            t_usual: Number(r.t_usual),
            t_max: Number(r.t_max),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || "Error al enviar");
        return;
      }
      setSubmitted(true);
    } catch {
      alert("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular TE y HH en frontend para preview
  const calcTE = (r: ActivityRow) => {
    const min = Number(r.t_min) || 0;
    const us = Number(r.t_usual) || 0;
    const max = Number(r.t_max) || 0;
    return ((min + 4 * us + max) / 6) * 1.07;
  };
  const calcHH = (r: ActivityRow) => {
    const freq = Number(r.monthly_frequency) || 0;
    return freq * calcTE(r);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-3 text-red-400" />
          <h1 className="text-xl font-bold text-slate-900">Enlace no válido</h1>
          <p className="mt-2 text-slate-600">
            Este enlace de encuesta no existe o ha expirado.
          </p>
        </div>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Clock size={48} className="mx-auto mb-3 text-amber-400" />
          <h1 className="text-xl font-bold text-slate-900">Encuesta cerrada</h1>
          <p className="mt-2 text-slate-600">
            El plazo para responder esta encuesta ha finalizado.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
          <h1 className="text-xl font-bold text-slate-900">
            Respuesta enviada
          </h1>
          <p className="mt-2 text-slate-600">
            Tus actividades han sido registradas exitosamente. Gracias por tu
            colaboración.
          </p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Cargando encuesta…</p>
      </div>
    );
  }

  const totalHH = rows.reduce((sum, r) => sum + calcHH(r), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-cyan-50 p-3">
              <ClipboardList size={28} className="text-cyan-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {info.survey_name}
              </h1>
              <p className="text-sm text-slate-600">{info.entity_name}</p>
              {info.survey_deadline && (
                <p className="mt-1 text-xs text-amber-600">
                  Fecha límite: {info.survey_deadline}
                </p>
              )}
            </div>
          </div>
          {info.survey_description && (
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {info.survey_description}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-sm">
              <span className="font-medium">Participante:</span>{" "}
              {info.full_name}
            </p>
            <p className="text-sm text-slate-600">
              Dependencia: {info.department_name} · Vinculación: {info.link_type}
              {info.contract_number && ` · Contrato: ${info.contract_number}`}
            </p>
          </div>
        </div>
      </div>

      {/* Activities form */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Registre sus actividades
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Liste todas las actividades que realiza en su cargo/contrato. Para cada
          una indique cuántas veces al mes la realiza y cuánto tiempo le toma
          (mínimo, usual y máximo en horas).
        </p>

        {/* Frequency hints */}
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Frecuencias comunes:</span>
          {FREQ_HINTS.map((h) => (
            <span
              key={h.label}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {h.label} = {h.value}
            </span>
          ))}
        </div>

        <div className="space-y-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Actividad {i + 1}
                </span>
                <div className="flex items-center gap-3">
                  {calcHH(row) > 0 && (
                    <span className="text-xs font-medium text-cyan-700">
                      {calcHH(row).toFixed(2)} HH/mes
                    </span>
                  )}
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Proceso
                  </label>
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    placeholder="Ej: Gestión financiera"
                    value={row.process}
                    onChange={(e) => updateRow(i, "process", e.target.value)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Actividad / Función *
                  </label>
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    placeholder="Descripción de la actividad que realiza"
                    value={row.activity}
                    onChange={(e) => updateRow(i, "activity", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Frecuencia mensual *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    placeholder="Veces/mes"
                    value={row.monthly_frequency}
                    onChange={(e) =>
                      updateRow(i, "monthly_frequency", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Tiempo mínimo (horas) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    value={row.t_min}
                    onChange={(e) => updateRow(i, "t_min", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Tiempo usual (horas) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    value={row.t_usual}
                    onChange={(e) => updateRow(i, "t_usual", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Tiempo máximo (horas) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    value={row.t_max}
                    onChange={(e) => updateRow(i, "t_max", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Nivel jerárquico
                  </label>
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    value={row.hierarchy_level}
                    onChange={(e) =>
                      updateRow(i, "hierarchy_level", e.target.value)
                    }
                  >
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={row.is_core_activity}
                      onChange={(e) =>
                        updateRow(i, "is_core_activity", e.target.checked)
                      }
                    />
                    Actividad misional
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Observaciones
                  </label>
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
                    value={row.observations}
                    onChange={(e) =>
                      updateRow(i, "observations", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            <Plus size={14} /> Agregar otra actividad
          </button>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-700">
              Total: {totalHH.toFixed(2)} HH/mes
            </p>
            <p className="text-xs text-slate-500">
              ({rows.filter((r) => r.activity).length} actividades)
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? "Enviando…" : "Enviar mis actividades"}
          </button>
        </div>
      </div>
    </div>
  );
}
