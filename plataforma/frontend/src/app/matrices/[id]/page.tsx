"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, API_URL } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";
import { num, standardTime, hhMonth } from "@/lib/calc";
import type {
  ConsolidationResult,
  Department,
  JobNomenclature,
  Paginated,
  WorkloadEntry,
  WorkloadMatrix,
} from "@/types";
import {
  ArrowLeft,
  Download,
  Plus,
  Save,
  Trash2,
  BarChart3,
} from "lucide-react";

type Row = WorkloadEntry & { _dirty?: boolean; _tempId?: string };

const LEVELS = [
  { value: "ASESOR", label: "Asesor" },
  { value: "PROFESIONAL", label: "Profesional" },
  { value: "TECNICO", label: "Técnico" },
  { value: "ASISTENCIAL", label: "Asistencial" },
] as const;

export default function MatrixEditorPage() {
  return (
    <RequireContext need="restructuring">
      <MatrixEditorInner />
    </RequireContext>
  );
}

function MatrixEditorInner() {
  const params = useParams<{ id: string }>();
  const matrixId = Number(params.id);

  const [matrix, setMatrix] = useState<WorkloadMatrix | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [nomenclature, setNomenclature] = useState<JobNomenclature[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [activeDept, setActiveDept] = useState<number | null>(null);
  const [consolidation, setConsolidation] = useState<ConsolidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewDept, setShowNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  const load = async () => {
    const m = await api.get<WorkloadMatrix>(`/matrices/${matrixId}/`);
    setMatrix(m);
    const [deps, entries, nom] = await Promise.all([
      api.get<Paginated<Department>>(`/dependencias/`, { page_size: 200 }),
      api.get<Paginated<WorkloadEntry>>(`/cargas/`, { matrix: matrixId, page_size: 500 }),
      api.get<JobNomenclature[]>(`/nomenclatura/`),
    ]);
    setDepartments(deps.results);
    setRows(entries.results as Row[]);
    setNomenclature(nom);
    if (!activeDept && deps.results.length > 0) setActiveDept(deps.results[0].id);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixId]);

  const createDepartment = async () => {
    if (!newDeptName.trim() || !matrix) return;
    const created = await api.post<Department>(`/dependencias/`, {
      entity: matrix.entity,
      name: newDeptName.trim(),
      order: departments.length + 1,
    });
    setDepartments([...departments, created]);
    setActiveDept(created.id);
    setNewDeptName("");
    setShowNewDept(false);
  };

  const addRow = () => {
    if (!activeDept) return;
    const temp: Row = {
      _tempId: `tmp-${Date.now()}`,
      _dirty: true,
      matrix: matrixId,
      department: activeDept,
      process: "",
      activity: "",
      procedure: "",
      hierarchy_level: "PROFESIONAL",
      requirements: "",
      job_denomination: "",
      job_code: "",
      job_grade: "",
      main_purpose: "",
      monthly_frequency: 1,
      t_min: 0,
      t_usual: 0,
      t_max: 0,
    };
    setRows((r) => [...r, temp]);
  };

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch, _dirty: true } : row)));
  };

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    if (row.id) {
      if (!confirm("¿Eliminar esta actividad del estudio?")) return;
      await api.delete(`/cargas/${row.id}/`);
    }
    setRows((r) => r.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    const dirty = rows.filter((r) => r._dirty);
    if (dirty.length === 0) return;
    setSaving(true);
    try {
      for (const row of dirty) {
        const payload = {
          matrix: matrixId,
          department: row.department,
          process: row.process,
          activity: row.activity,
          procedure: row.procedure,
          hierarchy_level: row.hierarchy_level,
          requirements: row.requirements,
          job_denomination: row.job_denomination,
          job_code: row.job_code,
          job_grade: row.job_grade,
          main_purpose: row.main_purpose,
          monthly_frequency: row.monthly_frequency,
          t_min: row.t_min,
          t_usual: row.t_usual,
          t_max: row.t_max,
        };
        if (row.id) {
          await api.put(`/cargas/${row.id}/`, payload);
        } else {
          await api.post(`/cargas/`, payload);
        }
      }
      await load();
      setConsolidation(null);
    } catch (e) {
      alert("Error al guardar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const showConsolidation = async () => {
    const data = await api.get<ConsolidationResult>(
      `/matrices/${matrixId}/consolidado-nivel/`
    );
    setConsolidation(data);
  };

  const deptRows = useMemo(
    () => rows.map((r, i) => ({ row: r, idx: i })).filter((x) => x.row.department === activeDept),
    [rows, activeDept]
  );

  if (!matrix) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/matrices"
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            <ArrowLeft size={14} /> Volver
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{matrix.name}</h1>
          <p className="text-sm text-slate-600">
            {matrix.entity_name} · fecha {matrix.reference_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={showConsolidation}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <BarChart3 size={14} /> Consolidar
          </button>
          <ExportBar
            xlsxPath={`/matrices/${matrixId}/export/xlsx/`}
            docxPath={`/matrices/${matrixId}/export/docx/`}
          />
          <button
            onClick={saveAll}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:bg-slate-400"
          >
            <Save size={14} /> {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Tabs de dependencias */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {departments.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveDept(d.id)}
            className={
              "rounded-t-md border-b-2 px-3 py-1.5 text-xs font-medium transition " +
              (activeDept === d.id
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-500 hover:text-slate-800")
            }
          >
            {d.name}
          </button>
        ))}
        {!showNewDept ? (
          <button
            onClick={() => setShowNewDept(true)}
            className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-600 hover:border-brand-500 hover:text-brand-700"
          >
            <Plus size={12} className="inline" /> Dependencia
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createDepartment()}
              placeholder="Nombre de la dependencia"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <button
              onClick={createDepartment}
              className="rounded bg-brand-700 px-2 py-1 text-xs text-white"
            >
              OK
            </button>
            <button
              onClick={() => {
                setShowNewDept(false);
                setNewDeptName("");
              }}
              className="text-xs text-slate-400"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Grid editable */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold uppercase text-slate-600">
            Formulario 1 · {deptRows.length} actividad{deptRows.length === 1 ? "" : "es"}
          </span>
          <button
            onClick={addRow}
            disabled={!activeDept}
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:bg-slate-300"
          >
            <Plus size={12} /> Nueva actividad
          </button>
        </div>
        <div className="grid-scroll max-h-[65vh] overflow-auto">
          <table className="min-w-[1800px] w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-brand-700 text-white">
              <tr>
                <Th>1. Proceso</Th>
                <Th>2. Actividad</Th>
                <Th>3. Procedimiento</Th>
                <Th>4. Nivel</Th>
                <Th>5. Requisitos</Th>
                <Th>6. Denominación</Th>
                <Th>7. Cód.</Th>
                <Th>8. Grado</Th>
                <Th>9. Propósito principal</Th>
                <Th>10. Frec./mes</Th>
                <Th>11. Tmin</Th>
                <Th>12. TU</Th>
                <Th>13. Tmax</Th>
                <Th>14. TE</Th>
                <Th>HH/mes</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {deptRows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-6 text-center text-xs text-slate-500">
                    Sin actividades registradas. Agrega la primera.
                  </td>
                </tr>
              ) : (
                deptRows.map(({ row, idx }) => {
                  const te = standardTime(num(row.t_min), num(row.t_usual), num(row.t_max));
                  const hh = hhMonth(num(row.monthly_frequency), te);
                  return (
                    <tr
                      key={row.id ?? row._tempId}
                      className={row._dirty ? "bg-amber-50" : "hover:bg-slate-50"}
                    >
                      <Td>
                        <Input value={row.process} onChange={(v) => updateRow(idx, { process: v })} />
                      </Td>
                      <Td>
                        <Input value={row.activity} onChange={(v) => updateRow(idx, { activity: v })} />
                      </Td>
                      <Td>
                        <Input value={row.procedure} onChange={(v) => updateRow(idx, { procedure: v })} />
                      </Td>
                      <Td>
                        <select
                          value={row.hierarchy_level}
                          onChange={(e) =>
                            updateRow(idx, { hierarchy_level: e.target.value as Row["hierarchy_level"] })
                          }
                          className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
                        >
                          {LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <Input
                          value={row.requirements}
                          onChange={(v) => updateRow(idx, { requirements: v })}
                        />
                      </Td>
                      <Td>
                        <input
                          list={`nom-${idx}`}
                          value={row.job_denomination}
                          onChange={(e) => {
                            const val = e.target.value;
                            const hit = nomenclature.find(
                              (n) => n.denomination === val && n.level === row.hierarchy_level
                            );
                            updateRow(idx, {
                              job_denomination: val,
                              job_code: hit?.code ?? row.job_code,
                            });
                          }}
                          className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
                        />
                        <datalist id={`nom-${idx}`}>
                          {nomenclature
                            .filter((n) => n.level === row.hierarchy_level)
                            .map((n) => (
                              <option key={n.id} value={n.denomination}>
                                {n.code}
                              </option>
                            ))}
                        </datalist>
                      </Td>
                      <Td>
                        <Input
                          value={row.job_code}
                          onChange={(v) => updateRow(idx, { job_code: v })}
                          className="w-12"
                        />
                      </Td>
                      <Td>
                        <Input
                          value={row.job_grade}
                          onChange={(v) => updateRow(idx, { job_grade: v })}
                          className="w-12"
                        />
                      </Td>
                      <Td>
                        <Input
                          value={row.main_purpose}
                          onChange={(v) => updateRow(idx, { main_purpose: v })}
                        />
                      </Td>
                      <Td>
                        <NumberInput
                          value={num(row.monthly_frequency)}
                          onChange={(v) => updateRow(idx, { monthly_frequency: v })}
                        />
                      </Td>
                      <Td>
                        <NumberInput value={num(row.t_min)} onChange={(v) => updateRow(idx, { t_min: v })} />
                      </Td>
                      <Td>
                        <NumberInput value={num(row.t_usual)} onChange={(v) => updateRow(idx, { t_usual: v })} />
                      </Td>
                      <Td>
                        <NumberInput value={num(row.t_max)} onChange={(v) => updateRow(idx, { t_max: v })} />
                      </Td>
                      <Td className="bg-brand-50 text-right font-semibold tabular-nums text-brand-900">
                        {te.toFixed(2)}
                      </Td>
                      <Td className="bg-brand-50 text-right font-semibold tabular-nums text-brand-900">
                        {hh.toFixed(2)}
                      </Td>
                      <Td>
                        <button
                          onClick={() => removeRow(idx)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consolidado */}
      {consolidation && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
            <h3 className="text-xs font-semibold uppercase text-slate-600">
              Formulario 2 · Resumen empleos entidad
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2 text-left">Dependencia</th>
                  <th className="p-2 text-right">Asesor</th>
                  <th className="p-2 text-right">Profesional</th>
                  <th className="p-2 text-right">Técnico</th>
                  <th className="p-2 text-right">Asistencial</th>
                  <th className="p-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {consolidation.departments.map((d) => (
                  <tr key={d.department_id} className="border-t border-slate-100">
                    <td className="p-2">{d.department_name}</td>
                    <td className="p-2 text-right tabular-nums">
                      {d.positions_by_level.ASESOR ?? 0}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {d.positions_by_level.PROFESIONAL ?? 0}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {d.positions_by_level.TECNICO ?? 0}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {d.positions_by_level.ASISTENCIAL ?? 0}
                    </td>
                    <td className="p-2 text-right font-semibold tabular-nums">
                      {d.total_positions}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="p-2">Total entidad</td>
                  <td className="p-2 text-right tabular-nums">
                    {consolidation.totals.positions_by_level.ASESOR ?? 0}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {consolidation.totals.positions_by_level.PROFESIONAL ?? 0}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {consolidation.totals.positions_by_level.TECNICO ?? 0}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {consolidation.totals.positions_by_level.ASISTENCIAL ?? 0}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {consolidation.totals.total_positions}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">
            Nota: los cargos del nivel <strong>Directivo</strong> no se miden por cargas; se registran
            según la norma de estructura (1 por dependencia).
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Subcomponentes de celda ----

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-2 py-2 text-left font-semibold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"border-t border-slate-100 px-1 py-1 align-top " + className}>{children}</td>;
}
function Input({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={
        "w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] focus:border-brand-500 focus:outline-none " +
        className
      }
    />
  );
}
function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-16 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] tabular-nums focus:border-brand-500 focus:outline-none"
    />
  );
}
