"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileWarning,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type {
  DashboardResponse,
  DashboardSummary,
  DashboardRestructuringItem,
  DashboardRestructuringDetail,
} from "@/types";

const STATUS_COLORS: Record<string, string> = {
  BORRADOR: "bg-slate-200 text-slate-700",
  DIAGNOSTICO_COMPLETO: "bg-blue-100 text-blue-700",
  ANALISIS_COMPLETO: "bg-cyan-100 text-cyan-700",
  REVISION_JURIDICA: "bg-amber-100 text-amber-700",
  REVISION_FINANCIERA: "bg-orange-100 text-orange-700",
  CONCEPTO_DAFP_SOLICITADO: "bg-purple-100 text-purple-700",
  CONCEPTO_DAFP_RECIBIDO: "bg-violet-100 text-violet-700",
  COMISION_PERSONAL_INFORMADA: "bg-indigo-100 text-indigo-700",
  APROBADO: "bg-green-100 text-green-700",
  ACTO_EXPEDIDO: "bg-emerald-100 text-emerald-700",
  IMPLEMENTADO: "bg-teal-100 text-teal-700",
  ARCHIVADO: "bg-slate-100 text-slate-500",
};

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
          {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const activeEntity = useContextStore((s) => s.activeEntity);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = activeEntity
      ? `/dashboard/?entity=${activeEntity.id}`
      : "/dashboard/";
    api
      .get<DashboardResponse>(url)
      .then(setData)
      .catch((e) => setError(e.message || "Error cargando dashboard"))
      .finally(() => setLoading(false));
  }, [activeEntity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400">
        Cargando dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "Error desconocido"}
      </div>
    );
  }

  const { summary, restructurings, per_restructuring } = data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
          Panel principal
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Dashboard ejecutivo
        </h1>
        {activeEntity && (
          <p className="mt-1 text-sm text-slate-500">
            Entidad activa:{" "}
            <strong>{activeEntity.acronym || activeEntity.name}</strong>
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Reestructuraciones"
          value={summary.total_restructurings}
          icon={Building2}
          color="bg-brand-50 text-brand-700"
        />
        <KpiCard
          label="Empleados registrados"
          value={summary.total_employees}
          icon={Users}
          color="bg-blue-50 text-blue-700"
          sub={`${summary.total_protected} en retén social`}
        />
        <KpiCard
          label="Posiciones actuales"
          value={summary.total_positions_current}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-700"
          sub={`${summary.total_positions_proposed} propuestas`}
        />
        <KpiCard
          label="Validaciones en rojo"
          value={summary.validation_errors}
          icon={summary.validation_errors > 0 ? AlertTriangle : CheckCircle2}
          color={
            summary.validation_errors > 0
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }
          sub={`${summary.validation_warnings} advertencias`}
        />
      </div>

      {/* By status */}
      {Object.keys(summary.by_status).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Distribución por estado
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.by_status).map(([status, count]) => (
              <span
                key={status}
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  STATUS_COLORS[status] || "bg-slate-100 text-slate-700"
                }`}
              >
                {status.replace(/_/g, " ")} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de reestructuraciones activas */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Reestructuraciones
          </h2>
        </div>
        {restructurings.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No hay reestructuraciones para mostrar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Entidad</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Días en estado</th>
                  <th className="px-4 py-2 font-medium">Objetivos</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {restructurings.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {r.name}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.entity_name}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          STATUS_COLORS[r.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.days_in_status !== null ? (
                        <span
                          className={
                            r.days_in_status > 30
                              ? "text-red-600 font-semibold"
                              : r.days_in_status > 15
                              ? "text-amber-600"
                              : "text-slate-600"
                          }
                        >
                          {r.days_in_status}d
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.objectives_count}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/reestructuraciones/${r.id}/gobierno`}
                        className="text-brand-700 hover:underline inline-flex items-center gap-1"
                      >
                        Ver <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Consultas próximas a vencer */}
      {summary.upcoming_consultations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-amber-800">
            <Clock size={16} />
            <h2 className="text-sm font-semibold">
              Consultas próximas a vencer
            </h2>
          </div>
          <div className="space-y-2">
            {summary.upcoming_consultations.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm"
              >
                <div>
                  <span className="font-semibold text-slate-800">
                    {c.entity_target}
                  </span>
                  <span className="ml-2 text-slate-600">{c.subject}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    (c.days_pending ?? 999) <= 3
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {c.days_pending !== null ? `${c.days_pending}d` : "—"}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/consultas"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline"
          >
            Ver todas las consultas <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Detalle por reestructuración */}
      {per_restructuring.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Detalle por reestructuración
          </h2>
          {per_restructuring.map((d) => (
            <div
              key={d.restructuring_id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{d.name}</h3>
                <span className="text-xs text-slate-500">
                  {d.modules_complete_pct}% módulos con datos
                </span>
              </div>
              {/* Progress bar */}
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${d.modules_complete_pct}%` }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-slate-500">Validación</div>
                  <div className="mt-1 font-semibold">
                    <span className="text-red-600">
                      {d.validation.errors} errores
                    </span>
                    {" · "}
                    <span className="text-amber-600">
                      {d.validation.warnings} avisos
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-slate-500">Costo anual</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    ${(d.cost_proposed || d.cost_current).toLocaleString()}
                    {d.cost_delta !== 0 && (
                      <span
                        className={`ml-1 ${
                          d.cost_delta < 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        ({d.cost_delta > 0 ? "+" : ""}
                        {d.cost_delta.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-slate-500">Ley 617</div>
                  <div className="mt-1 font-semibold">
                    {d.law_617_current === null ? (
                      <span className="text-slate-400">Sin datos</span>
                    ) : d.law_617_current ? (
                      <span className="text-green-600">Cumple (actual)</span>
                    ) : (
                      <span className="text-red-600">No cumple (actual)</span>
                    )}
                    {d.law_617_projected !== null && (
                      <span className="ml-2 text-slate-500">
                        {d.law_617_projected ? "/ cumple (prop.)" : "/ no cumple (prop.)"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-slate-500">Protegidos / Delta pos.</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    <Shield size={12} className="inline mr-1 text-blue-600" />
                    {d.protected_count}
                    {" · "}
                    <span
                      className={
                        d.positions_delta < 0
                          ? "text-green-600"
                          : d.positions_delta > 0
                          ? "text-red-600"
                          : "text-slate-600"
                      }
                    >
                      {d.positions_delta > 0 ? "+" : ""}
                      {d.positions_delta} cargos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
