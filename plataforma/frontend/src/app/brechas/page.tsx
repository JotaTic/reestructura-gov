"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import type { Paginated, WorkloadMatrix, PayrollPlan } from "@/types";
import {
  AlertTriangle,
  CheckCircle,
  Minus,
  TrendingDown,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface GapLevel {
  hours_needed: number;
  positions_needed: number;
  positions_current: number;
  contractors: number;
  contractor_hours: number;
  gap: number;
  gap_with_contractors: number;
  semaphore: "VERDE" | "AMARILLO" | "ROJO";
}

interface GapDepartment {
  department_id: number;
  department_name: string;
  levels: Record<string, GapLevel>;
  total_hours_needed: number;
  total_positions_needed: number;
  total_positions_current: number;
  total_contractors: number;
  total_gap: number;
}

interface GapAnalysis {
  matrix_id: number;
  matrix_name: string;
  entity_name: string;
  current_plan_id: number | null;
  current_plan_name: string;
  by_department: GapDepartment[];
  by_level: Record<string, GapLevel>;
  totals: {
    total_positions_needed: number;
    total_positions_current: number;
    total_contractors: number;
    total_gap: number;
    total_gap_with_contractors: number;
    coverage_pct: number;
    semaphore: "VERDE" | "AMARILLO" | "ROJO";
  };
  alerts: { level: string; message: string }[];
}

const LEVEL_LABELS: Record<string, string> = {
  ASESOR: "Asesor",
  PROFESIONAL: "Profesional",
  TECNICO: "Técnico",
  ASISTENCIAL: "Asistencial",
};

const SEMAPHORE_COLORS: Record<string, string> = {
  VERDE: "bg-emerald-100 text-emerald-800",
  AMARILLO: "bg-amber-100 text-amber-800",
  ROJO: "bg-red-100 text-red-800",
};

export default function BrechasPage() {
  return (
    <RequireContext need="restructuring">
      <BrechasInner />
    </RequireContext>
  );
}

function BrechasInner() {
  const [matrices, setMatrices] = useState<WorkloadMatrix[]>([]);
  const [plans, setPlans] = useState<PayrollPlan[]>([]);
  const [selectedMatrix, setSelectedMatrix] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [includeContractors, setIncludeContractors] = useState(true);
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<WorkloadMatrix>>("/matrices/", { page_size: 100 }),
      api.get<Paginated<PayrollPlan>>("/plantas/", { page_size: 100 }),
    ]).then(([m, p]) => {
      setMatrices(m.results);
      setPlans(p.results);
      if (m.results.length > 0) setSelectedMatrix(String(m.results[0].id));
      setInitialLoad(false);
    });
  }, []);

  const analyze = async () => {
    if (!selectedMatrix) return;
    setLoading(true);
    const params: Record<string, string> = {
      include_contractors: String(includeContractors),
    };
    if (selectedPlan) params.plan_id = selectedPlan;
    const result = await api.get<GapAnalysis>(
      `/matrices/${selectedMatrix}/brechas/`,
      params
    );
    setAnalysis(result);
    setLoading(false);
  };

  if (initialLoad) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Análisis de Brechas de Personal
        </h1>
        <p className="text-sm text-slate-600">
          Compara las cargas laborales calculadas con la planta actual y los
          contratistas para identificar déficit o exceso de personal.
        </p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <label className="block text-sm font-medium text-slate-700">
            Matriz de cargas
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedMatrix}
            onChange={(e) => setSelectedMatrix(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {matrices.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="block text-sm font-medium text-slate-700">
            Planta de referencia
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
          >
            <option value="">(auto-detectar actual)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.kind_display})
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeContractors}
            onChange={(e) => setIncludeContractors(e.target.checked)}
          />
          Incluir contratistas OPS/CPS
        </label>
        <button
          onClick={analyze}
          disabled={!selectedMatrix || loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          <BarChart3 size={16} />
          {loading ? "Analizando…" : "Analizar brechas"}
        </button>
      </div>

      {analysis && (
        <>
          {/* KPI Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Cargos necesarios"
              value={analysis.totals.total_positions_needed}
              icon={<TrendingUp size={18} />}
            />
            <SummaryCard
              label="Cargos actuales"
              value={analysis.totals.total_positions_current}
              icon={<Minus size={18} />}
            />
            <SummaryCard
              label="Contratistas"
              value={analysis.totals.total_contractors}
              icon={<Minus size={18} />}
            />
            <SummaryCard
              label="Brecha neta"
              value={analysis.totals.total_gap}
              icon={
                analysis.totals.total_gap > 0 ? (
                  <TrendingDown size={18} />
                ) : (
                  <CheckCircle size={18} />
                )
              }
              alert={analysis.totals.total_gap > 0}
            />
            <div
              className={`rounded-lg border p-4 text-center ${
                SEMAPHORE_COLORS[analysis.totals.semaphore]
              }`}
            >
              <p className="text-xs font-medium">Cobertura</p>
              <p className="text-3xl font-bold">{analysis.totals.coverage_pct}%</p>
              <p className="text-xs">{analysis.totals.semaphore}</p>
            </div>
          </div>

          {/* Alerts */}
          {analysis.alerts.map((a, i) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-3 text-sm ${
                a.level === "error"
                  ? "bg-red-50 text-red-800"
                  : a.level === "warning"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-blue-50 text-blue-800"
              }`}
            >
              {a.level === "error" && <AlertTriangle size={14} className="mr-1 inline" />}
              {a.message}
            </div>
          ))}

          {/* Summary by level */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Resumen por nivel jerárquico
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nivel</th>
                    <th className="px-4 py-3 text-right">HH necesarias</th>
                    <th className="px-4 py-3 text-right">Cargos necesarios</th>
                    <th className="px-4 py-3 text-right">Cargos actuales</th>
                    <th className="px-4 py-3 text-right">Contratistas</th>
                    <th className="px-4 py-3 text-right">Brecha</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analysis.by_level).map(([level, data]) => (
                    <tr key={level} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 font-medium">
                        {LEVEL_LABELS[level] || level}
                      </td>
                      <td className="px-4 py-2.5 text-right">{data.hours_needed}</td>
                      <td className="px-4 py-2.5 text-right">{data.positions_needed}</td>
                      <td className="px-4 py-2.5 text-right">{data.positions_current}</td>
                      <td className="px-4 py-2.5 text-right">{data.contractors}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        <span
                          className={
                            data.gap > 0
                              ? "text-red-600"
                              : data.gap < 0
                              ? "text-emerald-600"
                              : ""
                          }
                        >
                          {data.gap > 0 ? `+${data.gap}` : data.gap}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            SEMAPHORE_COLORS[data.semaphore]
                          }`}
                        >
                          {data.semaphore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail by department */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Detalle por dependencia
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-left font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Dependencia</th>
                    {Object.keys(LEVEL_LABELS).map((l) => (
                      <th key={l} className="px-2 py-2.5 text-center" colSpan={3}>
                        {LEVEL_LABELS[l]}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right">Total brecha</th>
                  </tr>
                  <tr className="text-[10px] text-slate-400">
                    <th></th>
                    {Object.keys(LEVEL_LABELS).map((l) => (
                      <th key={l} className="px-1 text-center" colSpan={1}>
                        Neces.
                      </th>
                    ))}
                    {Object.keys(LEVEL_LABELS).map((l) => (
                      <th key={`a-${l}`} className="px-1 text-center" colSpan={1}>
                        Actual
                      </th>
                    ))}
                    {Object.keys(LEVEL_LABELS).map((l) => (
                      <th key={`g-${l}`} className="px-1 text-center" colSpan={1}>
                        Brecha
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.by_department.map((d) => (
                    <tr key={d.department_id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {d.department_name}
                      </td>
                      {Object.keys(LEVEL_LABELS).map((l) => {
                        const lv = d.levels[l];
                        if (!lv) return (
                          <td key={l} className="px-2 py-2 text-center text-slate-300" colSpan={3}>—</td>
                        );
                        return (
                          <td key={l} className="px-2 py-2 text-center" colSpan={3}>
                            <span
                              className={`inline-block min-w-[70px] rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                SEMAPHORE_COLORS[lv.semaphore]
                              }`}
                            >
                              {lv.positions_needed}/{lv.positions_current}
                              {lv.contractors > 0 && `+${lv.contractors}c`}
                              {" "}({lv.gap > 0 ? `+${lv.gap}` : lv.gap})
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-semibold">
                        <span
                          className={
                            d.total_gap > 0
                              ? "text-red-600"
                              : d.total_gap < 0
                              ? "text-emerald-600"
                              : ""
                          }
                        >
                          {d.total_gap > 0 ? `+${d.total_gap}` : d.total_gap}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!analysis && !loading && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <BarChart3 size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">
            Selecciona una matriz de cargas y haz clic en "Analizar brechas"
            para ver el comparativo.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  alert,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-slate-500">
        {icon} <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
