"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Department,
  HierarchyLevel,
  JobNomenclature,
  Paginated,
  PayrollPlan,
  PayrollPosition,
} from "@/types";
import { ArrowLeft, FileSpreadsheet, Plus, Save, Trash2 } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";

type Row = PayrollPosition & { _dirty?: boolean; _tempId?: string };

const LEVELS: { value: HierarchyLevel; label: string }[] = [
  { value: "DIRECTIVO", label: "Directivo" },
  { value: "ASESOR", label: "Asesor" },
  { value: "PROFESIONAL", label: "Profesional" },
  { value: "TECNICO", label: "Técnico" },
  { value: "ASISTENCIAL", label: "Asistencial" },
];

export default function PayrollPlanEditor() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const planId = Number(params.id);

  const [plan, setPlan] = useState<PayrollPlan | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [nomenclature, setNomenclature] = useState<JobNomenclature[]>([]);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const p = await api.get<PayrollPlan>(`/planes/${planId}/`);
    setPlan(p);
    const [pos, deps, nom] = await Promise.all([
      api.get<Paginated<PayrollPosition>>("/cargos-planta/", {
        plan: planId,
        page_size: 500,
      }),
      api.get<Paginated<Department>>("/dependencias/", { page_size: 200 }),
      api.get<JobNomenclature[]>("/nomenclatura/"),
    ]);
    setRows(pos.results as Row[]);
    setDepartments(deps.results);
    setNomenclature(nom);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const addRow = () => {
    const temp: Row = {
      _tempId: `tmp-${Date.now()}`,
      _dirty: true,
      plan: planId,
      department: null,
      hierarchy_level: "PROFESIONAL",
      denomination: "",
      code: "",
      grade: "",
      quantity: 1,
      monthly_salary: 0,
      notes: "",
    };
    setRows((r) => [...r, temp]);
  };

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch, _dirty: true } : row)));

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    if (row.id) {
      if (!confirm("¿Eliminar este cargo?")) return;
      await api.delete(`/cargos-planta/${row.id}/`);
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
          plan: planId,
          department: row.department,
          hierarchy_level: row.hierarchy_level,
          denomination: row.denomination,
          code: row.code,
          grade: row.grade,
          quantity: Number(row.quantity),
          monthly_salary: Number(row.monthly_salary),
          notes: row.notes,
        };
        if (row.id) {
          await api.put(`/cargos-planta/${row.id}/`, payload);
        } else {
          await api.post(`/cargos-planta/`, payload);
        }
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleImportXlsx = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await api.postForm<Record<string, unknown>>(
        `/planes/${planId}/importar-xlsx/`,
        formData
      );
      setImportResult(result);
      load();
    } catch (e: unknown) {
      setImportResult({ error: e instanceof Error ? e.message : "Error al importar" });
    } finally {
      setImporting(false);
    }
  };

  const totals = useMemo(() => {
    let qty = 0;
    let monthly = 0;
    for (const r of rows) {
      qty += Number(r.quantity) || 0;
      monthly += (Number(r.quantity) || 0) * (Number(r.monthly_salary) || 0);
    }
    return { qty, monthly, annual: monthly * 12 };
  }, [rows]);

  if (!plan) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/planta"
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            <ArrowLeft size={14} /> Volver
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{plan.name}</h1>
          <p className="text-sm text-slate-600">
            {plan.entity_name} · {plan.kind_display} · {plan.structure_display} ·
            fecha {plan.reference_date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportBar
            xlsxPath={`/planes/${plan.id}/export/xlsx/`}
            docxPath={`/planes/${plan.id}/export/docx/`}
          />
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet size={14} /> Importar Excel
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:bg-slate-400"
          >
            <Save size={14} /> {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* Modal importar Excel */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Importar Planta desde Excel</h2>
            <p className="mb-3 text-sm text-slate-600">
              Adjunta un archivo <strong>.xlsx</strong> con los cargos de la planta.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="mb-4 block w-full text-sm text-slate-600"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            {importResult && (
              <div className="mb-4 rounded bg-slate-50 p-3 text-xs text-slate-700">
                {importResult.error ? (
                  <p className="text-red-600">{String(importResult.error)}</p>
                ) : (
                  <>
                    {importResult.created !== undefined && (
                      <p>Cargos creados: <strong>{String(importResult.created)}</strong></p>
                    )}
                    {importResult.updated !== undefined && (
                      <p>Cargos actualizados: <strong>{String(importResult.updated)}</strong></p>
                    )}
                    {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                      <div className="mt-1 text-red-600">
                        {(importResult.errors as string[]).map((err, i) => <p key={i}>{err}</p>)}
                      </div>
                    )}
                    {Array.isArray(importResult.warnings) && importResult.warnings.length > 0 && (
                      <div className="mt-1 text-amber-700">
                        {(importResult.warnings as string[]).map((w, i) => <p key={i}>{w}</p>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleImportXlsx}
                disabled={!importFile || importing}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {importing ? "Importando…" : "Importar"}
              </button>
              <button
                onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }}
                className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cargos" value={totals.qty.toString()} />
        <Stat label="Costo mensual" value={money(totals.monthly)} />
        <Stat label="Costo anual (12 m)" value={money(totals.annual)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold uppercase text-slate-600">
            {rows.length} cargo{rows.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800"
          >
            <Plus size={12} /> Nuevo cargo
          </button>
        </div>
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[1200px] text-[11px]">
            <thead className="sticky top-0 z-10 bg-brand-700 text-white">
              <tr>
                <Th>Nivel</Th>
                <Th>Denominación</Th>
                <Th>Cód.</Th>
                <Th>Grado</Th>
                <Th>Dependencia</Th>
                <Th className="text-right">Cantidad</Th>
                <Th className="text-right">Salario mensual</Th>
                <Th className="text-right">Total mes</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-xs text-slate-500">
                    Sin cargos. Agrega el primero.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const totalMonth =
                    (Number(row.quantity) || 0) * (Number(row.monthly_salary) || 0);
                  return (
                    <tr
                      key={row.id ?? row._tempId}
                      className={row._dirty ? "bg-amber-50" : "hover:bg-slate-50"}
                    >
                      <Td>
                        <select
                          value={row.hierarchy_level}
                          onChange={(e) =>
                            updateRow(idx, {
                              hierarchy_level: e.target.value as HierarchyLevel,
                            })
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
                        <input
                          list={`nom-${idx}`}
                          value={row.denomination}
                          onChange={(e) => {
                            const val = e.target.value;
                            const hit = nomenclature.find(
                              (n) => n.denomination === val && n.level === row.hierarchy_level
                            );
                            updateRow(idx, {
                              denomination: val,
                              code: hit?.code ?? row.code,
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
                        <TextCell
                          value={row.code}
                          onChange={(v) => updateRow(idx, { code: v })}
                          className="w-12"
                        />
                      </Td>
                      <Td>
                        <TextCell
                          value={row.grade}
                          onChange={(v) => updateRow(idx, { grade: v })}
                          className="w-12"
                        />
                      </Td>
                      <Td>
                        <select
                          value={row.department ?? ""}
                          onChange={(e) =>
                            updateRow(idx, {
                              department: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
                        >
                          <option value="">— Global —</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td className="text-right">
                        <NumCell
                          value={Number(row.quantity)}
                          onChange={(v) => updateRow(idx, { quantity: v })}
                        />
                      </Td>
                      <Td className="text-right">
                        <NumCell
                          value={Number(row.monthly_salary)}
                          onChange={(v) => updateRow(idx, { monthly_salary: v })}
                          width="w-28"
                          step={1000}
                        />
                      </Td>
                      <Td className="bg-brand-50 text-right font-semibold tabular-nums text-brand-900">
                        {money(totalMonth)}
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
    </div>
  );
}

function money(n: number): string {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={"whitespace-nowrap px-2 py-2 text-left font-semibold " + className}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"border-t border-slate-100 px-1 py-1 align-top " + className}>{children}</td>;
}
function TextCell({
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
        "rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] focus:border-brand-500 focus:outline-none " +
        className
      }
    />
  );
}
function NumCell({
  value,
  onChange,
  width = "w-20",
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  width?: string;
  step?: number;
}) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className={
        "rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] tabular-nums focus:border-brand-500 focus:outline-none " +
        width
      }
    />
  );
}
