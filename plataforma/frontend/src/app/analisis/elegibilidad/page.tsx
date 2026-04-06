"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type {
  EligibilityBulkResult,
  EligibilityCostEstimate,
  EligibilityStatus,
  Employee,
  Paginated,
  PromotionEligibility,
} from "@/types";
import { GraduationCap, DollarSign, Download, Search, User } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";

const LEVELS = ["ASISTENCIAL", "TECNICO", "PROFESIONAL", "ASESOR", "DIRECTIVO"];

const statusColor: Record<EligibilityStatus, string> = {
  ELEGIBLE: "bg-emerald-100 text-emerald-800",
  ELEGIBLE_POR_EQUIVALENCIA: "bg-blue-100 text-blue-800",
  NO_ELEGIBLE: "bg-red-100 text-red-800",
};

export default function ElegibilidadPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const [mode, setMode] = useState<"bulk" | "individual">("bulk");
  const [fromLevel, setFromLevel] = useState("TECNICO");
  const [toLevel, setToLevel] = useState("PROFESIONAL");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligibilityBulkResult | null>(null);
  const [costResult, setCostResult] = useState<EligibilityCostEstimate | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Individual mode
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [individualResults, setIndividualResults] = useState<Record<string, PromotionEligibility> | null>(null);
  const [individualLoading, setIndividualLoading] = useState(false);

  const loadEmployees = async () => {
    try {
      const data = await api.get<Paginated<Employee>>("/empleados/");
      setEmployees(data.results);
    } catch {
      /* ignore */
    }
  };

  const analyzeIndividual = async () => {
    if (!selectedEmployee) return;
    setIndividualLoading(true);
    setError(null);
    setIndividualResults(null);
    const targetLevels = ["DIRECTIVO", "ASESOR", "PROFESIONAL", "TECNICO"];
    try {
      const results: Record<string, PromotionEligibility> = {};
      await Promise.all(
        targetLevels.map(async (level) => {
          const data = await api.post<PromotionEligibility>(
            "/analisis/elegibilidad/analizar-individual/",
            { employee_id: parseInt(selectedEmployee), target_level: level }
          );
          results[level] = data;
        })
      );
      setIndividualResults(results);
    } catch {
      setError("Error al analizar elegibilidad individual.");
    } finally {
      setIndividualLoading(false);
    }
  };

  const exportExcel = () => {
    window.open(api.downloadUrl("/analisis/elegibilidad/bulk/export/"), "_blank");
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCostResult(null);
    try {
      const data = await api.post<EligibilityBulkResult>(
        "/analisis/elegibilidad/bulk/",
        { from_level: fromLevel, to_level: toLevel }
      );
      setResult(data);
    } catch (e: unknown) {
      setError("Error al analizar. Verifique que haya empleados con vinculaciones activas.");
    } finally {
      setLoading(false);
    }
  };

  const estimateCost = async () => {
    if (!result) return;
    const eligibleIds = result.results
      .filter((r) => r.status !== "NO_ELEGIBLE")
      .map((r) => r.employee_id);
    if (eligibleIds.length === 0) {
      setError("No hay empleados elegibles para estimar costo.");
      return;
    }
    setCostLoading(true);
    try {
      const data = await api.post<EligibilityCostEstimate>(
        "/analisis/elegibilidad/estimar-costo/",
        { employee_ids: eligibleIds, target_level: toLevel, target_code: "", target_grade: "" }
      );
      setCostResult(data);
    } catch {
      setError("Error al estimar costo.");
    } finally {
      setCostLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center gap-3">
        <GraduationCap className="text-brand-700" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Elegibilidad para Nivelación</h1>
          <p className="text-sm text-slate-600">
            Motor de elegibilidad — Decreto 785/2005 art. 25 (equivalencias territoriales)
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("bulk"); setIndividualResults(null); }}
          className={`rounded-md px-4 py-2 text-sm font-medium ${mode === "bulk" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          <Search size={14} className="mr-1 inline" />
          Análisis masivo
        </button>
        <button
          onClick={() => { setMode("individual"); setResult(null); setCostResult(null); if (employees.length === 0) loadEmployees(); }}
          className={`rounded-md px-4 py-2 text-sm font-medium ${mode === "individual" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          <User size={14} className="mr-1 inline" />
          Análisis individual
        </button>
      </div>

      {/* Individual mode */}
      {mode === "individual" && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Análisis individual por empleado</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Empleado</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Seleccionar empleado —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.id_number})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={analyzeIndividual}
                disabled={!selectedEmployee || individualLoading}
                className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                <Search size={14} />
                {individualLoading ? "Analizando…" : "Analizar todos los niveles"}
              </button>
            </div>
          </div>

          {individualResults && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Object.entries(individualResults).map(([level, result]) => (
                <div
                  key={level}
                  className={`rounded-lg border p-4 ${
                    result.status === "ELEGIBLE"
                      ? "border-emerald-200 bg-emerald-50"
                      : result.status === "ELEGIBLE_POR_EQUIVALENCIA"
                      ? "border-blue-200 bg-blue-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-slate-800">{level}</h4>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${statusColor[result.status]}`}>
                      {result.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {result.matched_education && (
                    <p className="text-xs text-slate-600">Educación: {result.matched_education}</p>
                  )}
                  <p className="text-xs text-slate-600">
                    Experiencia pública: {result.total_public_experience_years.toFixed(1)} años
                  </p>
                  {result.gap.length > 0 && (
                    <div className="mt-1">
                      <p className="text-[10px] font-medium text-red-700">Brechas:</p>
                      {result.gap.map((g, i) => (
                        <p key={i} className="text-[10px] text-red-600">• {g}</p>
                      ))}
                    </div>
                  )}
                  {result.equivalence_applied && (
                    <p className="mt-1 text-[10px] text-blue-700">Equivalencia: {result.equivalence_applied}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wizard de selección */}
      {mode === "bulk" && <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Parámetros de análisis</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nivel origen
            </label>
            <select
              value={fromLevel}
              onChange={(e) => setFromLevel(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nivel destino
            </label>
            <select
              value={toLevel}
              onChange={(e) => setToLevel(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={analyze}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              <Search size={14} />
              {loading ? "Analizando…" : "Analizar"}
            </button>
          </div>
        </div>
      </div>}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {mode === "bulk" && result && (
        <>
          {/* Export button */}
          <div className="flex justify-end">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={14} />
              Exportar a Excel
            </button>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total analizados", value: result.total_analyzed, color: "text-slate-900" },
              { label: "Elegibles directos", value: result.eligible_direct, color: "text-emerald-700" },
              { label: "Por equivalencia", value: result.eligible_by_equivalence, color: "text-blue-700" },
              { label: "No elegibles", value: result.not_eligible, color: "text-red-700" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabla de resultados */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">
                Resultados individuales ({result.results.length})
              </h3>
              <button
                onClick={estimateCost}
                disabled={costLoading}
                className="inline-flex items-center gap-1 rounded-md border border-brand-700 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              >
                <DollarSign size={12} />
                {costLoading ? "Calculando…" : "Estimar costo"}
              </button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="p-2 text-left">Empleado</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-left">Educación</th>
                  <th className="p-2 text-left">Exp. pública (años)</th>
                  <th className="p-2 text-left">Brechas</th>
                  <th className="p-2 text-left">Equivalencia</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2 font-medium text-slate-900">{r.employee_name}</td>
                    <td className="p-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusColor[r.status]}`}
                      >
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600">{r.matched_education ?? "—"}</td>
                    <td className="p-2 text-slate-600">{r.total_public_experience_years.toFixed(1)}</td>
                    <td className="p-2 text-red-700">
                      {r.gap.length > 0 ? r.gap.join("; ") : "—"}
                    </td>
                    <td className="p-2 text-blue-700">{r.equivalence_applied ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Estimación de costo */}
          {costResult && (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Estimación de costo de nivelación
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { label: "Empleados", value: costResult.employees_count },
                  { label: "Promedio mensual actual", value: `$${costResult.current_monthly_avg.toLocaleString()}` },
                  { label: "Nuevo promedio mensual", value: `$${costResult.new_monthly_avg.toLocaleString()}` },
                  { label: "Delta mensual", value: `$${costResult.monthly_delta.toLocaleString()}` },
                  { label: "Delta anual total", value: `$${costResult.annual_delta.toLocaleString()}` },
                ].map((s) => (
                  <div key={s.label} className="rounded border border-slate-200 p-3 text-center">
                    <p className="text-lg font-bold text-slate-900">{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
