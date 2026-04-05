"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FunctionsManual, Paginated, WorkloadMatrix } from "@/types";
import { FileText } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";

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
        <p className="text-sm text-slate-500">Generando manual…</p>
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
                  <span className="text-xs text-slate-500">
                    ×{job.positions_required} cargo{job.positions_required === 1 ? "" : "s"}
                  </span>
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
