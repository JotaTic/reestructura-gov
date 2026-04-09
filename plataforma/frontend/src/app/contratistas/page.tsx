"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import {
  Plus,
  AlertTriangle,
  Users,
  DollarSign,
  TrendingUp,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import type { Paginated, Department } from "@/types";

interface Contractor {
  id: number;
  full_name: string;
  id_number: string;
  contract_type: string;
  contract_type_display: string;
  contract_number: string;
  contract_object: string;
  contract_value: string;
  monthly_value: string;
  department: number;
  department_name: string;
  supervisor: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  duration_months: number;
  executes_permanent_functions: boolean;
  replaces_plant_position: boolean;
  suggested_hierarchy_level: string;
  activities_count: number;
  notes: string;
}

interface ContractorSummary {
  total_contractors: number;
  by_type: Record<string, number>;
  permanent_functions_count: number;
  permanent_functions_pct: number;
  replaces_plant_count: number;
  total_monthly_cost: number;
  total_annual_cost: number;
  misional_activities: number;
  total_activities: number;
  misional_pct: number;
  alerts: { level: string; message: string }[];
}

const CONTRACT_TYPES = [
  { value: "OPS", label: "OPS" },
  { value: "CPS", label: "CPS" },
  { value: "OTRO", label: "Otro" },
];

const LEVELS = [
  { value: "", label: "— No aplica —" },
  { value: "ASESOR", label: "Asesor" },
  { value: "PROFESIONAL", label: "Profesional" },
  { value: "TECNICO", label: "Técnico" },
  { value: "ASISTENCIAL", label: "Asistencial" },
];

export default function ContratistasPage() {
  return (
    <RequireContext need="restructuring">
      <ContratistasInner />
    </RequireContext>
  );
}

function ContratistasInner() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [summary, setSummary] = useState<ContractorSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    id_type: "CC",
    id_number: "",
    contract_type: "CPS",
    contract_number: "",
    contract_object: "",
    contract_value: "",
    monthly_value: "",
    department: "",
    supervisor: "",
    start_date: "",
    end_date: "",
    education_level: "",
    profession: "",
    experience_years: "0",
    executes_permanent_functions: false,
    replaces_plant_position: false,
    suggested_hierarchy_level: "",
    notes: "",
  });

  const load = async () => {
    const [c, d, s] = await Promise.all([
      api.get<Paginated<Contractor>>("/contratistas/", { page_size: 500 }),
      api.get<Paginated<Department>>("/dependencias/", { page_size: 200 }),
      api.get<ContractorSummary>("/contratistas/resumen/"),
    ]);
    setContractors(c.results);
    setDepartments(d.results);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post("/contratistas/", {
      ...form,
      department: Number(form.department),
      contract_value: Number(form.contract_value) || 0,
      monthly_value: Number(form.monthly_value) || 0,
      experience_years: Number(form.experience_years) || 0,
    });
    setShowForm(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este contratista?")) return;
    await api.delete(`/contratistas/${id}/`);
    load();
  };

  const filtered = contractors.filter(
    (c) =>
      !filter ||
      c.full_name.toLowerCase().includes(filter.toLowerCase()) ||
      c.contract_number.includes(filter) ||
      c.department_name.toLowerCase().includes(filter.toLowerCase())
  );

  const fmt = (n: number) =>
    n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  if (loading) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Contratistas OPS/CPS
          </h1>
          <p className="text-sm text-slate-600">
            Registro de contratistas para el análisis de cargas y
            desnaturalización contractual.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          <Plus size={16} /> Nuevo contratista
        </button>
      </div>

      {/* KPI cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Users size={20} />}
            label="Total contratistas"
            value={String(summary.total_contractors)}
            detail={`OPS: ${summary.by_type.OPS || 0} · CPS: ${summary.by_type.CPS || 0}`}
          />
          <KpiCard
            icon={<DollarSign size={20} />}
            label="Costo mensual"
            value={fmt(summary.total_monthly_cost)}
            detail={`Anual: ${fmt(summary.total_annual_cost)}`}
          />
          <KpiCard
            icon={<AlertTriangle size={20} />}
            label="Funciones permanentes"
            value={`${summary.permanent_functions_count}`}
            detail={`${summary.permanent_functions_pct}% del total`}
            alert={summary.permanent_functions_count > 0}
          />
          <KpiCard
            icon={<TrendingUp size={20} />}
            label="Actividades misionales"
            value={`${summary.misional_activities}`}
            detail={`${summary.misional_pct}% de ${summary.total_activities} actividades`}
            alert={summary.misional_pct > 50}
          />
        </div>
      )}

      {/* Alerts */}
      {summary?.alerts?.map((a, i) => (
        <div
          key={i}
          className={`rounded-lg px-4 py-3 text-sm ${
            a.level === "warning"
              ? "bg-amber-50 text-amber-800"
              : "bg-blue-50 text-blue-800"
          }`}
        >
          {a.message}
        </div>
      ))}

      {/* Search */}
      <input
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Buscar por nombre, contrato o dependencia…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Contratista</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Contrato</th>
              <th className="px-3 py-3">Dependencia</th>
              <th className="px-3 py-3">Valor/mes</th>
              <th className="px-3 py-3">Meses</th>
              <th className="px-3 py-3">Func. perm.</th>
              <th className="px-3 py-3">Suple cargo</th>
              <th className="px-3 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium text-slate-900">
                  {c.full_name}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      c.contract_type === "OPS"
                        ? "bg-blue-100 text-blue-700"
                        : c.contract_type === "CPS"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {c.contract_type}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {c.contract_number}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {c.department_name}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-600">
                  {fmt(Number(c.monthly_value))}
                </td>
                <td className="px-3 py-2.5 text-center">{c.duration_months}</td>
                <td className="px-3 py-2.5 text-center">
                  {c.executes_permanent_functions ? (
                    <span className="text-amber-600 font-semibold">Sí</span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {c.replaces_plant_position ? (
                    <span className="text-red-600 font-semibold">Sí</span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => remove(c.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No hay contratistas registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Nuevo contratista</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Cédula
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.id_number}
                  onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Tipo de contrato
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.contract_type}
                  onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                >
                  {CONTRACT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Número de contrato
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.contract_number}
                  onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Objeto del contrato
                </label>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={form.contract_object}
                  onChange={(e) => setForm({ ...form, contract_object: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Valor total del contrato
                </label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.contract_value}
                  onChange={(e) => setForm({ ...form, contract_value: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Valor mensual estimado
                </label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.monthly_value}
                  onChange={(e) => setForm({ ...form, monthly_value: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Dependencia
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  required
                >
                  <option value="">Seleccionar…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Supervisor
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.supervisor}
                  onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Profesión/título
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.profession}
                  onChange={(e) => setForm({ ...form, profession: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Fecha fin
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2 border-t border-slate-200 pt-3 mt-1">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Análisis de desnaturalización
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={form.executes_permanent_functions}
                  onChange={(e) =>
                    setForm({ ...form, executes_permanent_functions: e.target.checked })
                  }
                />
                <label htmlFor="permanent" className="text-sm text-slate-700">
                  Ejecuta funciones permanentes
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="replaces"
                  checked={form.replaces_plant_position}
                  onChange={(e) =>
                    setForm({ ...form, replaces_plant_position: e.target.checked })
                  }
                />
                <label htmlFor="replaces" className="text-sm text-slate-700">
                  Suple un cargo de planta
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nivel jerárquico sugerido
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.suggested_hierarchy_level}
                  onChange={(e) =>
                    setForm({ ...form, suggested_hierarchy_level: e.target.value })
                  }
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Observaciones
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={create}
                disabled={!form.full_name || !form.id_number || !form.department || !form.contract_number}
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Crear contratista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-slate-500">{icon} <span className="text-xs">{label}</span></div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  );
}
