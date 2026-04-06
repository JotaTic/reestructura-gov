"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FunctionsManual, FunctionsManualJob, Paginated, WorkloadMatrix } from "@/types";
import { FileText, Pencil, X, Plus, Trash2 } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";

interface OverrideForm {
  job_code: string;
  job_grade: string;
  custom_purpose: string;
  custom_functions: string[];
  custom_requirements: string;
}

export default function ManualFuncionesPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const [matrices, setMatrices] = useState<WorkloadMatrix[]>([]);
  const [matrixId, setMatrixId] = useState<number | null>(null);
  const [manual, setManual] = useState<FunctionsManual | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [editingJob, setEditingJob] = useState<FunctionsManualJob | null>(null);
  const [editForm, setEditForm] = useState<OverrideForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Track overridden jobs (job_code+job_grade)
  const [overriddenKeys, setOverriddenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<Paginated<WorkloadMatrix>>("/matrices/", { page_size: 100 }).then((d) => {
      setMatrices(d.results);
      if (d.results.length > 0) setMatrixId(d.results[0].id);
    });
  }, []);

  useEffect(() => {
    if (!matrixId) return;
    setLoading(true);
    api
      .get<FunctionsManual>(`/matrices/${matrixId}/manual-funciones/`)
      .then(setManual)
      .finally(() => setLoading(false));
  }, [matrixId]);

  // Load overrides list
  useEffect(() => {
    if (!matrixId) return;
    api
      .get<{ results: Array<{ job_code: string; job_grade: string }> }>("/manual-funciones-override/", { page_size: 500 })
      .then((d) => {
        const keys = new Set(d.results.map((o) => `${o.job_code}|${o.job_grade}`));
        setOverriddenKeys(keys);
      })
      .catch(() => {
        // endpoint may not exist yet — ignore
      });
  }, [matrixId]);

  const openEdit = (job: FunctionsManualJob) => {
    setEditingJob(job);
    setEditForm({
      job_code: job.job_code,
      job_grade: job.job_grade,
      custom_purpose: job.main_purpose || "",
      custom_functions: job.functions.length > 0 ? [...job.functions] : [""],
      custom_requirements: job.requirements || "",
    });
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingJob(null);
    setEditForm(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await api.post("/manual-funciones-override/", {
        job_code: editForm.job_code,
        job_grade: editForm.job_grade,
        custom_purpose: editForm.custom_purpose,
        custom_functions: editForm.custom_functions.filter((f) => f.trim() !== ""),
        custom_requirements: editForm.custom_requirements,
      });
      setOverriddenKeys((prev) => {
        const next = new Set(prev);
        next.add(`${editForm.job_code}|${editForm.job_grade}`);
        return next;
      });
      closeEdit();
      // Reload manual to reflect overrides
      if (matrixId) {
        api.get<FunctionsManual>(`/matrices/${matrixId}/manual-funciones/`).then(setManual);
      }
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Error al guardar personalización");
    } finally {
      setSavingEdit(false);
    }
  };

  const updateFunction = (idx: number, value: string) => {
    if (!editForm) return;
    const fns = [...editForm.custom_functions];
    fns[idx] = value;
    setEditForm({ ...editForm, custom_functions: fns });
  };

  const addFunction = () => {
    if (!editForm) return;
    setEditForm({ ...editForm, custom_functions: [...editForm.custom_functions, ""] });
  };

  const removeFunction = (idx: number) => {
    if (!editForm) return;
    const fns = editForm.custom_functions.filter((_, i) => i !== idx);
    setEditForm({ ...editForm, custom_functions: fns.length > 0 ? fns : [""] });
  };

  const isOverridden = (job: FunctionsManualJob) =>
    overriddenKeys.has(`${job.job_code}|${job.job_grade}`);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manual específico de funciones</h1>
          <p className="text-sm text-slate-600">
            Generado automáticamente a partir del levantamiento de cargas
            (Módulo 10). Agrupado por cargo (denominación + código + grado).
          </p>
        </div>
        <ExportBar
          xlsxPath={matrixId ? `/matrices/${matrixId}/manual-funciones/export/xlsx/` : undefined}
          docxPath={matrixId ? `/matrices/${matrixId}/manual-funciones/export/docx/` : undefined}
          disabled={!manual}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 print:hidden">
        <label className="block text-xs font-medium text-slate-700">Matriz de cargas</label>
        <select
          value={matrixId ?? ""}
          onChange={(e) => setMatrixId(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-96"
        >
          {matrices.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.entity_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Generando manual...</p>
      ) : !manual ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <FileText className="mx-auto text-slate-400" size={32} />
          <p className="mt-2 text-sm text-slate-500">
            Selecciona una matriz con actividades registradas.
          </p>
        </div>
      ) : manual.jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Esta matriz aún no tiene actividades registradas.
          </p>
        </div>
      ) : (
        <>
          <header className="rounded-lg border border-slate-200 bg-white p-5 text-center">
            <h2 className="text-lg font-bold text-slate-900">
              MANUAL ESPECÍFICO DE FUNCIONES Y COMPETENCIAS LABORALES
            </h2>
            <p className="text-sm text-slate-700">{manual.entity}</p>
            <p className="text-xs text-slate-500">
              Estudio: {manual.matrix_name} · Decreto {manual.nomenclature_decree}
            </p>
          </header>

          {manual.jobs.map((job, idx) => (
            <article
              key={idx}
              className="rounded-lg border border-slate-200 bg-white p-5 print:break-inside-avoid"
            >
              <header className="mb-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-800">
                    {job.hierarchy_level}
                  </span>
                  {job.job_code && (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      Cód. {job.job_code}
                    </span>
                  )}
                  {job.job_grade && (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      Grado {job.job_grade}
                    </span>
                  )}
                  {isOverridden(job) && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Editado
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    x{job.positions_required} cargo{job.positions_required === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => openEdit(job)}
                    className="ml-auto flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 print:hidden"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">{job.job_denomination}</h3>
                {job.departments.length > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Dependencias: {job.departments.join(", ")}
                  </p>
                )}
              </header>

              <Section title="I. Propósito principal">
                <p className="text-sm text-slate-800">{job.main_purpose || "—"}</p>
              </Section>

              <Section title="II. Funciones esenciales">
                {job.functions.length === 0 ? (
                  <p className="text-sm italic text-slate-500">Sin funciones registradas.</p>
                ) : (
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
                    {job.functions.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section title="III. Requisitos de estudio y experiencia">
                <p className="text-sm text-slate-800">{job.requirements || "—"}</p>
              </Section>
            </article>
          ))}
        </>
      )}

      {/* Edit Modal */}
      {editingJob && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">
                Editar — {editingJob.job_denomination}
              </h2>
              <button onClick={closeEdit} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Cód. {editForm.job_code} · Grado {editForm.job_grade}
            </p>

            {editError && (
              <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{editError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Propósito</label>
                <textarea
                  value={editForm.custom_purpose}
                  onChange={(e) => setEditForm({ ...editForm, custom_purpose: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Funciones</label>
                <div className="space-y-2">
                  {editForm.custom_functions.map((fn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}.</span>
                      <input
                        value={fn}
                        onChange={(e) => updateFunction(idx, e.target.value)}
                        className="flex-1 rounded border px-2 py-1.5 text-sm"
                        placeholder="Descripción de la función"
                      />
                      <button
                        onClick={() => removeFunction(idx)}
                        className="text-red-400 hover:text-red-600"
                        title="Eliminar función"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addFunction}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
                  >
                    <Plus size={14} /> Agregar función
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Requisitos de estudio y experiencia
                </label>
                <textarea
                  value={editForm.custom_requirements}
                  onChange={(e) => setEditForm({ ...editForm, custom_requirements: e.target.value })}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  rows={2}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {savingEdit ? "Guardando..." : "Guardar personalización"}
              </button>
              <button
                onClick={closeEdit}
                className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="mt-1">{children}</div>
    </section>
  );
}
