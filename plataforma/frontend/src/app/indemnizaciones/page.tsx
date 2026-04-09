"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { Plus, Trash2, Calculator, DollarSign, TrendingDown, Clock } from "lucide-react";
import type { Paginated } from "@/types";

interface Analysis { id: number; restructuring: number; name: string; reference_date: string; notes: string; costs_count: number; created_at: string; }
interface Cost { id: number; analysis: number; employee_name: string; position_denomination: string; position_code: string; department_name: string; appointment_type: string; appointment_type_display: string; years_of_service: string; monthly_salary: string; severance_cost: string; pending_benefits: string; total_suppression_cost: string; annual_savings: string; break_even_months: string; has_reten_social: boolean; reten_type: string; notes: string; }
interface Summary { total_positions: number; total_severance: number; total_pending_benefits: number; total_suppression_cost: number; total_annual_savings: number; break_even_months: number; reten_social_count: number; }

const APT_TYPES = [
  { value: "CARRERA", label: "Carrera" }, { value: "LNR", label: "LNR" },
  { value: "PROVISIONAL", label: "Provisional" }, { value: "TEMPORAL", label: "Temporal" },
  { value: "TRABAJADOR_OFICIAL", label: "Trabajador oficial" },
];

export default function IndemnizacionesPage() {
  return <RequireContext need="restructuring"><Inner /></RequireContext>;
}

function Inner() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [active, setActive] = useState<Analysis | null>(null);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [analysisName, setAnalysisName] = useState("");
  const [costForm, setCostForm] = useState({ employee_name: "", position_denomination: "", position_code: "", department_name: "", appointment_type: "CARRERA", years_of_service: "0", monthly_salary: "0", pending_benefits: "0", has_reten_social: false, reten_type: "", notes: "" });

  const loadAnalyses = () => {
    setLoading(true);
    api.get<Paginated<Analysis>>("/analisis-supresion/", { page_size: 50 }).then((d) => {
      setAnalyses(d.results);
      if (d.results.length > 0 && !active) setActive(d.results[0]);
    }).finally(() => setLoading(false));
  };

  const loadCosts = () => {
    if (!active) return;
    Promise.all([
      api.get<Paginated<Cost>>("/costos-supresion/", { analysis: active.id, page_size: 500 }),
      api.get<Summary>(`/analisis-supresion/${active.id}/resumen/`),
    ]).then(([c, s]) => { setCosts(c.results); setSummary(s); });
  };

  useEffect(() => { loadAnalyses(); }, []);
  useEffect(() => { loadCosts(); }, [active]);

  const createAnalysis = async () => {
    const a = await api.post<Analysis>("/analisis-supresion/", { name: analysisName, reference_date: new Date().toISOString().slice(0, 10) });
    setAnalyses([a, ...analyses]);
    setActive(a);
    setShowForm(false);
    setAnalysisName("");
  };

  const createCost = async () => {
    if (!active) return;
    await api.post("/costos-supresion/", { analysis: active.id, ...costForm, years_of_service: Number(costForm.years_of_service), monthly_salary: Number(costForm.monthly_salary), pending_benefits: Number(costForm.pending_benefits) });
    setShowCostForm(false);
    setCostForm({ employee_name: "", position_denomination: "", position_code: "", department_name: "", appointment_type: "CARRERA", years_of_service: "0", monthly_salary: "0", pending_benefits: "0", has_reten_social: false, reten_type: "", notes: "" });
    loadCosts();
  };

  const deleteCost = async (id: number) => { if (!confirm("¿Eliminar?")) return; await api.delete(`/costos-supresion/${id}/`); loadCosts(); };

  const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  if (loading) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Indemnizaciones y Costos de Supresión</h1>
          <p className="text-sm text-slate-600">Cálculo de costos por tipo de vinculación, break-even y retén social.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"><Plus size={14} /> Nuevo análisis</button>
          {active && <button onClick={() => setShowCostForm(true)} className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"><Plus size={16} /> Agregar cargo</button>}
        </div>
      </div>

      {analyses.length > 0 && (
        <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={active?.id || ""} onChange={(e) => setActive(analyses.find((a) => a.id === Number(e.target.value)) || null)}>
          {analyses.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-slate-500"><Calculator size={18} /><span className="text-xs">Cargos a suprimir</span></div><p className="mt-1 text-2xl font-bold">{summary.total_positions}</p><p className="text-xs text-slate-500">{summary.reten_social_count} con retén social</p></div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2 text-red-500"><DollarSign size={18} /><span className="text-xs">Costo total supresión</span></div><p className="mt-1 text-2xl font-bold text-red-800">{fmt(summary.total_suppression_cost)}</p><p className="text-xs text-red-600">Indemnizaciones: {fmt(summary.total_severance)}</p></div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-emerald-500"><TrendingDown size={18} /><span className="text-xs">Ahorro anual</span></div><p className="mt-1 text-2xl font-bold text-emerald-800">{fmt(summary.total_annual_savings)}</p></div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4"><div className="flex items-center gap-2 text-blue-500"><Clock size={18} /><span className="text-xs">Break-even</span></div><p className="mt-1 text-2xl font-bold text-blue-800">{summary.break_even_months} meses</p></div>
        </div>
      )}

      {active && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Empleado</th>
                <th className="px-3 py-3">Cargo</th>
                <th className="px-3 py-3">Dependencia</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3 text-right">Salario/mes</th>
                <th className="px-3 py-3 text-right">Años</th>
                <th className="px-3 py-3 text-right">Indemnización</th>
                <th className="px-3 py-3 text-right">Costo total</th>
                <th className="px-3 py-3 text-right">Ahorro/año</th>
                <th className="px-3 py-3">Retén</th>
                <th className="px-3 py-3">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.id} className={"border-t border-slate-100 " + (c.has_reten_social ? "bg-amber-50" : "")}>
                  <td className="px-3 py-2 font-medium">{c.employee_name || "Vacante"}</td>
                  <td className="px-3 py-2 text-slate-600">{c.position_denomination}</td>
                  <td className="px-3 py-2 text-slate-600">{c.department_name}</td>
                  <td className="px-3 py-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{c.appointment_type_display}</span></td>
                  <td className="px-3 py-2 text-right">{fmt(Number(c.monthly_salary))}</td>
                  <td className="px-3 py-2 text-right">{c.years_of_service}</td>
                  <td className="px-3 py-2 text-right font-medium text-red-600">{fmt(Number(c.severance_cost))}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(Number(c.total_suppression_cost))}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{fmt(Number(c.annual_savings))}</td>
                  <td className="px-3 py-2">{c.has_reten_social ? <span className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold text-amber-800">{c.reten_type || "Sí"}</span> : <span className="text-slate-400">No</span>}</td>
                  <td className="px-3 py-2"><button onClick={() => deleteCost(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {costs.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">No hay cargos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal analysis */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Nuevo análisis</h2>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre del análisis" value={analysisName} onChange={(e) => setAnalysisName(e.target.value)} autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={createAnalysis} disabled={!analysisName} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cost */}
      {showCostForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Agregar cargo a suprimir</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="block text-sm font-medium text-slate-700">Empleado</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.employee_name} onChange={(e) => setCostForm({ ...costForm, employee_name: e.target.value })} placeholder="Nombre o 'Vacante'" /></div>
              <div><label className="block text-sm font-medium text-slate-700">Cargo</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.position_denomination} onChange={(e) => setCostForm({ ...costForm, position_denomination: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium text-slate-700">Código</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.position_code} onChange={(e) => setCostForm({ ...costForm, position_code: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700">Dependencia</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.department_name} onChange={(e) => setCostForm({ ...costForm, department_name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700">Tipo vinculación</label><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.appointment_type} onChange={(e) => setCostForm({ ...costForm, appointment_type: e.target.value })}>{APT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700">Años de servicio</label><input type="number" step="0.5" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.years_of_service} onChange={(e) => setCostForm({ ...costForm, years_of_service: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700">Salario mensual</label><input type="number" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.monthly_salary} onChange={(e) => setCostForm({ ...costForm, monthly_salary: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700">Prestaciones pendientes</label><input type="number" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={costForm.pending_benefits} onChange={(e) => setCostForm({ ...costForm, pending_benefits: e.target.value })} /></div>
              <div className="sm:col-span-2 flex items-center gap-3 border-t pt-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={costForm.has_reten_social} onChange={(e) => setCostForm({ ...costForm, has_reten_social: e.target.checked })} /> Tiene retén social</label>
                {costForm.has_reten_social && <input className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm" placeholder="Tipo de retén" value={costForm.reten_type} onChange={(e) => setCostForm({ ...costForm, reten_type: e.target.value })} />}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCostForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={createCost} disabled={!costForm.position_denomination} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
