"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  EmployeeHojaDeVida,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeTraining,
  EmployeeEvaluation,
  EmploymentRecord,
} from "@/types";
import { ArrowLeft, IdCard, Upload } from "lucide-react";

type Tab = "basica" | "estudios" | "experiencia" | "capacitacion" | "evaluaciones" | "empleos";

const TABS: { id: Tab; label: string }[] = [
  { id: "basica", label: "Básica" },
  { id: "estudios", label: "Estudios" },
  { id: "experiencia", label: "Experiencia" },
  { id: "capacitacion", label: "Capacitación" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "empleos", label: "Empleos" },
];

export default function EmpleadoDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<EmployeeHojaDeVida | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("basica");
  const [showCvUpload, setShowCvUpload] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvResult, setCvResult] = useState<Record<string, unknown> | null>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<EmployeeHojaDeVida>(`/empleados/${id}/hoja-de-vida/`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  const handleCvUpload = async () => {
    if (!cvFile) return;
    setUploadingCv(true);
    setCvResult(null);
    try {
      const formData = new FormData();
      formData.append("file", cvFile);
      const result = await api.postForm<Record<string, unknown>>(
        `/empleados/${id}/upload-cv/`,
        formData
      );
      setCvResult(result);
    } catch (e: unknown) {
      setCvResult({ error: e instanceof Error ? e.message : "Error al subir CV" });
    } finally {
      setUploadingCv(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Cargando hoja de vida...</div>;
  if (!data) return <div className="p-6 text-sm text-red-500">No se pudo cargar la hoja de vida.</div>;

  const emp = data.employee;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/talento/empleados" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Volver
        </Link>
        <div className="flex items-center gap-2">
          <IdCard className="text-brand-600" size={20} />
          <h1 className="text-xl font-bold">{emp.full_name}</h1>
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {emp.id_type} {emp.id_number}
        </span>
        {data.retirement_eligibility?.is_pre_pensioned && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 font-medium">
            Pre-pensionado
          </span>
        )}
        <button
          onClick={() => setShowCvUpload(true)}
          className="ml-auto flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Upload size={14} /> Subir CV
        </button>
      </div>

      {/* Modal subir CV */}
      {showCvUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Subir hoja de vida (CV)</h2>
            <p className="mb-3 text-sm text-slate-600">
              Adjunta el archivo de hoja de vida del empleado (PDF, DOCX, etc.).
            </p>
            <input
              ref={cvFileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="mb-4 block w-full text-sm text-slate-600"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
            />
            {cvResult && (
              <div className="mb-4 rounded bg-slate-50 p-3 text-xs text-slate-700">
                {cvResult.error ? (
                  <p className="text-red-600">{String(cvResult.error)}</p>
                ) : (
                  <p className="text-green-700">CV subido correctamente.{cvResult.url ? ` Archivo: ${String(cvResult.url)}` : ""}</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCvUpload}
                disabled={!cvFile || uploadingCv}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {uploadingCv ? "Subiendo…" : "Subir"}
              </button>
              <button
                onClick={() => { setShowCvUpload(false); setCvFile(null); setCvResult(null); }}
                className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumen rápido */}
      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-slate-500">Tiempo total servicio</div>
          <div className="font-semibold">{data.tenure?.total_years?.toFixed(1)} años</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-slate-500">En entidad actual</div>
          <div className="font-semibold">{Math.round((data.tenure?.days_in_current_entity || 0) / 365.25 * 10) / 10} años</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-slate-500">Elegibilidad pensión</div>
          <div className={`font-semibold text-xs ${data.retirement_eligibility?.is_pre_pensioned ? "text-amber-600" : "text-green-600"}`}>
            {data.retirement_eligibility?.reason?.slice(0, 80)}...
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm transition ${
                tab === t.id
                  ? "border-b-2 border-brand-600 text-brand-700 font-medium"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de tab */}
      {tab === "basica" && <BasicaTab emp={emp} />}
      {tab === "estudios" && <EstudiosTab items={data.education} />}
      {tab === "experiencia" && <ExperienciaTab items={data.experience} />}
      {tab === "capacitacion" && <CapacitacionTab items={data.training} />}
      {tab === "evaluaciones" && <EvaluacionesTab items={data.evaluations} />}
      {tab === "empleos" && <EmpleosTab items={data.employment_records} />}
    </div>
  );
}

function BasicaTab({ emp }: { emp: EmployeeHojaDeVida["employee"] }) {
  const rows: [string, string | boolean | null | undefined][] = [
    ["Nombre completo", emp.full_name],
    ["Primer nombre", emp.first_name],
    ["Apellidos", emp.last_name],
    ["Tipo de documento", emp.id_type],
    ["Número de documento", emp.id_number],
    ["Fecha de nacimiento", emp.birth_date],
    ["Sexo", emp.sex],
    ["Cabeza de hogar", emp.is_head_of_household ? "Sí" : "No"],
    ["Discapacidad", emp.has_disability ? `Sí (${emp.disability_percentage ?? 0}%)` : "No"],
    ["Correo", emp.email || "—"],
    ["Teléfono", emp.phone || "—"],
    ["Dirección", emp.address || "—"],
  ];
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, val]) => (
            <tr key={label} className="border-b last:border-0">
              <td className="bg-slate-50 px-4 py-2 font-medium w-48">{label}</td>
              <td className="px-4 py-2">{String(val ?? "—")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstudiosTab({ items }: { items: EmployeeEducation[] }) {
  if (!items.length) return <p className="text-sm text-slate-500">Sin estudios registrados.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Nivel</th>
            <th className="px-3 py-2 text-left">Institución</th>
            <th className="px-3 py-2 text-left">Programa</th>
            <th className="px-3 py-2 text-left">Título</th>
            <th className="px-3 py-2 text-left">Fecha grado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">{e.level_display ?? e.level}</td>
              <td className="px-3 py-2">{e.institution}</td>
              <td className="px-3 py-2">{e.program}</td>
              <td className="px-3 py-2">{e.title}</td>
              <td className="px-3 py-2">{e.graduation_date ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExperienciaTab({ items }: { items: EmployeeExperience[] }) {
  if (!items.length) return <p className="text-sm text-slate-500">Sin experiencia registrada.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Empleador</th>
            <th className="px-3 py-2 text-left">Cargo</th>
            <th className="px-3 py-2 text-left">Sector</th>
            <th className="px-3 py-2 text-left">Inicio</th>
            <th className="px-3 py-2 text-left">Retiro</th>
            <th className="px-3 py-2 text-center">Público</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">{e.employer}</td>
              <td className="px-3 py-2">{e.position_name}</td>
              <td className="px-3 py-2">{e.sector_display ?? e.sector}</td>
              <td className="px-3 py-2">{e.start_date}</td>
              <td className="px-3 py-2">{e.end_date ?? "Actual"}</td>
              <td className="px-3 py-2 text-center">{e.is_public_sector ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CapacitacionTab({ items }: { items: EmployeeTraining[] }) {
  if (!items.length) return <p className="text-sm text-slate-500">Sin capacitaciones registradas.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Tema</th>
            <th className="px-3 py-2 text-center">Horas</th>
            <th className="px-3 py-2 text-left">Institución</th>
            <th className="px-3 py-2 text-left">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">{t.topic}</td>
              <td className="px-3 py-2 text-center">{t.hours}</td>
              <td className="px-3 py-2">{t.institution}</td>
              <td className="px-3 py-2">{t.completed_at ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvaluacionesTab({ items }: { items: EmployeeEvaluation[] }) {
  if (!items.length) return <p className="text-sm text-slate-500">Sin evaluaciones registradas.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-center">Año</th>
            <th className="px-3 py-2 text-center">Puntaje</th>
            <th className="px-3 py-2 text-left">Resultado</th>
            <th className="px-3 py-2 text-left">Evaluador</th>
            <th className="px-3 py-2 text-left">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {items.map((ev, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 text-center">{ev.year}</td>
              <td className="px-3 py-2 text-center">{ev.score}</td>
              <td className="px-3 py-2">{ev.result_display ?? ev.result}</td>
              <td className="px-3 py-2">{ev.evaluator}</td>
              <td className="px-3 py-2">{ev.at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmpleosTab({ items }: { items: EmploymentRecord[] }) {
  if (!items.length) return <p className="text-sm text-slate-500">Sin vinculaciones registradas.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Posesión</th>
            <th className="px-3 py-2 text-left">Retiro</th>
            <th className="px-3 py-2 text-left">Situación</th>
            <th className="px-3 py-2 text-center">Vigente</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">{r.appointment_type_display ?? r.appointment_type}</td>
              <td className="px-3 py-2">{r.appointment_date}</td>
              <td className="px-3 py-2">{r.termination_date ?? "—"}</td>
              <td className="px-3 py-2">{r.administrative_status_display ?? r.administrative_status}</td>
              <td className="px-3 py-2 text-center">{r.is_active ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
