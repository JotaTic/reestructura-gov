"use client";

import { useEffect, useState } from "react";
import {
  BarChart2,
  ChevronDown,
  ChevronRight,
  Copy,
  GitCompare,
  Play,
  Plus,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type { Paginated, PayrollPlan, Scenario, ScenarioComparison, ScenarioMetrics } from "@/types";

function MetricsCard({ metrics }: { metrics: ScenarioMetrics }) {
  return (
    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded bg-slate-50 p-2">
        <div className="text-slate-500">Posiciones</div>
        <div className="font-semibold text-slate-900">
          {metrics.total_positions}
        </div>
      </div>
      <div className="rounded bg-slate-50 p-2">
        <div className="text-slate-500">Costo mensual efectivo</div>
        <div className="font-semibold text-slate-900">
          ${metrics.total_monthly_effective?.toLocaleString() ?? "—"}
        </div>
      </div>
      <div className="rounded bg-slate-50 p-2">
        <div className="text-slate-500">Costo anual</div>
        <div className="font-semibold text-slate-900">
          ${metrics.total_annual?.toLocaleString() ?? "—"}
        </div>
      </div>
      <div className="rounded bg-slate-50 p-2">
        <div className="text-slate-500">Ley 617 (año actual)</div>
        <div
          className={`font-semibold ${
            metrics.law_617_current_year === null
              ? "text-slate-400"
              : metrics.law_617_current_year
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {metrics.law_617_current_year === null
            ? "Sin datos"
            : metrics.law_617_current_year
            ? "Cumple"
            : "No cumple"}
        </div>
      </div>
      <div className="rounded bg-slate-50 p-2">
        <div className="text-slate-500">Años que rompe Ley 617</div>
        <div
          className={`font-semibold ${
            metrics.law_617_years_broken > 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          {metrics.law_617_years_broken}
        </div>
      </div>
      <div className="rounded bg-slate-50 p-2">
        <div className="text-slate-500">Cobertura mandatos</div>
        <div className="font-semibold text-slate-900">
          {metrics.mandate_coverage_pct !== null
            ? `${metrics.mandate_coverage_pct}%`
            : "—"}
        </div>
      </div>
    </div>
  );
}

export default function SimuladorPage() {
  const activeEntity = useContextStore((s) => s.activeEntity);
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [plans, setPlans] = useState<PayrollPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [expandedMetrics, setExpandedMetrics] = useState<number | null>(null);

  // Modal clonar
  const [showClone, setShowClone] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [clonePlanId, setClonePlanId] = useState<string>("");
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    if (!activeEntity || !activeRestructuring) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get<Paginated<Scenario>>("/simulador/"),
      api.get<Paginated<PayrollPlan>>("/plantas/"),
    ])
      .then(([scenResp, planResp]) => {
        setScenarios(scenResp.results);
        setPlans(planResp.results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity?.id, activeRestructuring?.id]);

  const evaluate = async (id: number) => {
    try {
      const resp = await api.post<{ metrics: ScenarioMetrics }>(
        `/simulador/${id}/evaluar/`,
        {}
      );
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, cached_metrics: resp.metrics } : s
        )
      );
      setExpandedMetrics(id);
    } catch {
      alert("Error evaluando el escenario.");
    }
  };

  const cloneScenario = async () => {
    if (!clonePlanId || !cloneName) return;
    setCloning(true);
    try {
      const created = await api.post<Scenario>(
        "/simulador/clonar/",
        { plan_id: parseInt(clonePlanId), name: cloneName }
      );
      setScenarios((prev) => [created, ...prev]);
      setShowClone(false);
      setCloneName("");
      setClonePlanId("");
    } catch {
      alert("Error clonando el plan.");
    } finally {
      setCloning(false);
    }
  };

  const compare = async () => {
    if (selected.length < 2) {
      alert("Selecciona al menos 2 escenarios para comparar.");
      return;
    }
    try {
      const result = await api.post<ScenarioComparison>(
        "/simulador/comparar/",
        { scenario_ids: selected }
      );
      setComparison(result);
    } catch {
      alert("Error comparando escenarios.");
    }
  };

  if (!activeEntity || !activeRestructuring) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 text-sm">
        Selecciona una entidad y reestructuración activa en la barra superior para usar el simulador.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
            Simulador
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Escenarios de reestructuración
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {activeRestructuring.name} — {activeEntity.name}
          </p>
        </div>
        <div className="flex gap-2">
          {selected.length >= 2 && (
            <button
              onClick={compare}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <GitCompare size={14} />
              Comparar seleccionados ({selected.length})
            </button>
          )}
          <button
            onClick={() => setShowClone(true)}
            className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            <Copy size={14} />
            Clonar plan a escenario
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-400">Cargando escenarios...</div>
      )}

      {!loading && scenarios.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          <GitCompare size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm">
            No hay escenarios creados para esta reestructuración.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Usa el botón "Clonar plan a escenario" para comenzar.
          </p>
        </div>
      )}

      {/* Lista de escenarios */}
      <div className="space-y-3">
        {scenarios.map((s) => {
          const hasMetrics =
            s.cached_metrics &&
            Object.keys(s.cached_metrics).length > 0;
          const metrics = hasMetrics ? (s.cached_metrics as ScenarioMetrics) : null;
          const isExpanded = expandedMetrics === s.id;

          return (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected((prev) => [...prev, s.id]);
                      } else {
                        setSelected((prev) => prev.filter((id) => id !== s.id));
                      }
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {s.name}
                      </span>
                      {s.is_baseline && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                          BASELINE
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-slate-500">{s.description}</p>
                    )}
                    {s.payroll_plan_name && (
                      <p className="text-xs text-slate-400">
                        Plan: {s.payroll_plan_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => evaluate(s.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    <Play size={12} />
                    Evaluar
                  </button>
                  {hasMetrics && (
                    <button
                      onClick={() =>
                        setExpandedMetrics(isExpanded ? null : s.id)
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <BarChart2 size={12} />
                      Métricas
                      {isExpanded ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && metrics && <MetricsCard metrics={metrics} />}
            </div>
          );
        })}
      </div>

      {/* Comparación */}
      {comparison && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-indigo-800 flex items-center gap-2">
              <GitCompare size={16} /> Comparación de escenarios
            </h2>
            <button
              onClick={() => setComparison(null)}
              className="text-indigo-500 hover:text-indigo-700"
            >
              <X size={16} />
            </button>
          </div>

          {/* Rankings */}
          <div className="mb-4 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <div className="font-semibold text-slate-700 mb-1">Por costo (menor)</div>
              {comparison.rankings.by_cost.map((id, i) => {
                const sc = comparison.scenarios.find((s) => s.id === id);
                return sc ? (
                  <div key={id} className="flex items-center gap-1">
                    <span className="text-slate-400">{i + 1}.</span>
                    <span>{sc.name}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <div className="font-semibold text-slate-700 mb-1">Por cumplimiento Ley 617</div>
              {comparison.rankings.by_law_617_compliance.map((id, i) => {
                const sc = comparison.scenarios.find((s) => s.id === id);
                return sc ? (
                  <div key={id} className="flex items-center gap-1">
                    <span className="text-slate-400">{i + 1}.</span>
                    <span>{sc.name}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <div className="font-semibold text-slate-700 mb-1">Por posiciones (menor)</div>
              {comparison.rankings.by_positions.map((id, i) => {
                const sc = comparison.scenarios.find((s) => s.id === id);
                return sc ? (
                  <div key={id} className="flex items-center gap-1">
                    <span className="text-slate-400">{i + 1}.</span>
                    <span>{sc.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Tabla N-aria */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Métrica</th>
                  {comparison.scenarios.map((sc) => (
                    <th key={sc.id} className="px-3 py-2 font-medium">
                      {sc.name}
                      {sc.is_baseline && (
                        <span className="ml-1 text-[9px] text-brand-600">
                          BASE
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "total_positions", label: "Posiciones" },
                  { key: "total_annual", label: "Costo anual" },
                  { key: "law_617_current_year", label: "Ley 617 actual" },
                  { key: "law_617_years_broken", label: "Años fuera Ley 617" },
                  { key: "mandate_coverage_pct", label: "Cobertura mandatos" },
                ].map((row) => (
                  <tr key={row.key} className="border-t border-white/50">
                    <td className="bg-indigo-100 px-3 py-1.5 font-medium text-indigo-800">
                      {row.label}
                    </td>
                    {comparison.scenarios.map((sc) => {
                      const val = sc.metrics[row.key as keyof ScenarioMetrics];
                      let display: string;
                      if (val === null || val === undefined) {
                        display = "—";
                      } else if (typeof val === "boolean") {
                        display = val ? "Sí" : "No";
                      } else if (
                        row.key === "total_annual" ||
                        row.key === "total_monthly_effective"
                      ) {
                        display = `$${Number(val).toLocaleString()}`;
                      } else if (row.key === "mandate_coverage_pct") {
                        display = `${val}%`;
                      } else {
                        display = String(val);
                      }
                      return (
                        <td
                          key={sc.id}
                          className="bg-white px-3 py-1.5 text-slate-800"
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal clonar */}
      {showClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              Clonar plan a escenario
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Se clonará el plan y sus posiciones, creando un nuevo escenario
              editable.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Plan a clonar *
                </label>
                <select
                  value={clonePlanId}
                  onChange={(e) => setClonePlanId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Selecciona un plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.kind_display})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Nombre del escenario *
                </label>
                <input
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="Alternativa con reducción 10%"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={cloneScenario}
                disabled={!clonePlanId || !cloneName || cloning}
                className="flex-1 rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:bg-slate-300"
              >
                {cloning ? "Clonando..." : "Clonar"}
              </button>
              <button
                onClick={() => {
                  setShowClone(false);
                  setCloneName("");
                  setClonePlanId("");
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
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
