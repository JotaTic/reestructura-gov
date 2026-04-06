"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Workflow, CheckCircle, XCircle, Clock, History, User } from "lucide-react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import type { Restructuring, WorkflowTransition, RestructuringStatus } from "@/types";

const STATUS_ORDER: RestructuringStatus[] = [
  "BORRADOR",
  "DIAGNOSTICO_COMPLETO",
  "ANALISIS_COMPLETO",
  "REVISION_JURIDICA",
  "REVISION_FINANCIERA",
  "CONCEPTO_DAFP_SOLICITADO",
  "CONCEPTO_DAFP_RECIBIDO",
  "COMISION_PERSONAL_INFORMADA",
  "APROBADO",
  "ACTO_EXPEDIDO",
  "IMPLEMENTADO",
  "ARCHIVADO",
];

const STATUS_LABELS: Record<RestructuringStatus, string> = {
  BORRADOR: "Borrador",
  DIAGNOSTICO_COMPLETO: "Diagnóstico",
  ANALISIS_COMPLETO: "Análisis",
  REVISION_JURIDICA: "Rev. Jurídica",
  REVISION_FINANCIERA: "Rev. Financiera",
  CONCEPTO_DAFP_SOLICITADO: "DAFP Sol.",
  CONCEPTO_DAFP_RECIBIDO: "DAFP Rec.",
  COMISION_PERSONAL_INFORMADA: "Comisión",
  APROBADO: "Aprobada",
  ACTO_EXPEDIDO: "Acto Exp.",
  IMPLEMENTADO: "Implementada",
  ARCHIVADO: "Archivada",
};

export default function GobiernoPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const params = useParams();
  const id = params?.id as string;
  const [restr, setRestr] = useState<Restructuring | null>(null);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<{
    id: number;
    action: string;
    action_display: string;
    user: string | null;
    at: string;
    before_status: string | null;
    after_status: string | null;
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([
        api.get<Restructuring>(`/reestructuraciones/${id}/`),
        api.get<WorkflowTransition[]>(`/reestructuraciones/${id}/transiciones/`),
      ]);
      setRestr(r);
      setTransitions(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.get<typeof history>(`/reestructuraciones/${id}/historial/`);
      setHistory(data);
      setShowHistory(true);
    } catch {
      // silently fail
    }
  };

  useEffect(() => { load(); }, [id]);

  const executeTransition = async (toStatus: string) => {
    setExecuting(toStatus);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.post<{ new_status: string; new_status_display: string; since: string }>(
        `/reestructuraciones/${id}/transicionar/`,
        { to_status: toStatus }
      );
      setSuccess(`Estado cambiado a: ${result.new_status_display}`);
      await load();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Error al ejecutar la transición");
      }
    } finally {
      setExecuting(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Cargando…</p>;
  if (!restr) return <p className="text-sm text-red-500">Reestructuración no encontrada.</p>;

  const currentIndex = STATUS_ORDER.indexOf(restr.status as RestructuringStatus);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/reestructuraciones"
          className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
        >
          <ArrowLeft size={14} /> Volver a reestructuraciones
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Workflow className="text-brand-700" size={24} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Gobierno del Proceso</h1>
              <p className="text-sm text-slate-600">{restr.name} · {restr.status_display}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadHistory}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <History size={14} />
              Historial
            </button>
            <a
              href={api.downloadUrl(`/reestructuraciones/${id}/estudio-tecnico/`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              <Download size={14} />
              Generar Estudio Tecnico
            </a>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Estado del proceso</h2>
        <div className="flex flex-wrap gap-1">
          {STATUS_ORDER.map((s, idx) => {
            const isCurrent = s === restr.status;
            const isPast = idx < currentIndex;
            return (
              <div
                key={s}
                title={s}
                className={[
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  isCurrent
                    ? "bg-brand-700 text-white ring-2 ring-brand-400"
                    : isPast
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {isPast && <CheckCircle size={11} />}
                {STATUS_LABELS[s]}
              </div>
            );
          })}
        </div>
        {restr.current_status_since && (
          <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
            <Clock size={11} />
            En este estado desde: {new Date(restr.current_status_since).toLocaleString("es-CO")}
          </p>
        )}
      </div>

      {/* Alertas */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Transiciones disponibles */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Transiciones disponibles</h2>
        {transitions.length === 0 ? (
          <p className="text-sm text-slate-500">No hay transiciones disponibles desde este estado.</p>
        ) : (
          <div className="space-y-3">
            {transitions.map((t) => {
              const blocked = t.blocked_by.length > 0;
              return (
                <div
                  key={t.to_status}
                  className={[
                    "rounded-lg border p-4",
                    blocked ? "border-slate-200 bg-slate-50" : "border-brand-200 bg-brand-50",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        → {STATUS_LABELS[t.to_status as RestructuringStatus] ?? t.to_status}
                        <span className="ml-2 text-[11px] font-normal text-slate-500">
                          ({t.name})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Responsable: <strong>{t.responsible_group}</strong> · {t.description}
                      </p>
                    </div>
                    <button
                      onClick={() => !blocked && executeTransition(t.to_status)}
                      disabled={blocked || executing === t.to_status}
                      title={blocked ? t.blocked_by.join(" | ") : "Ejecutar transición"}
                      className={[
                        "shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition",
                        blocked
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-brand-700 text-white hover:bg-brand-800",
                        executing === t.to_status ? "opacity-60 cursor-wait" : "",
                      ].join(" ")}
                    >
                      {executing === t.to_status ? "Ejecutando…" : "Ejecutar"}
                    </button>
                  </div>

                  {blocked && (
                    <div className="mt-2 space-y-1">
                      {t.blocked_by.map((reason, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-[11px] text-red-600">
                          <XCircle size={12} className="mt-0.5 shrink-0" />
                          {reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de transiciones */}
      {showHistory && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <History size={16} /> Historial de cambios
            </h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cerrar
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No hay cambios registrados.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    h.action === "UPDATE" ? "bg-blue-100 text-blue-600" :
                    h.action === "CREATE" ? "bg-emerald-100 text-emerald-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {h.action === "UPDATE" ? <History size={12} /> : <CheckCircle size={12} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {h.action_display}
                      </span>
                      {h.before_status && h.after_status && h.before_status !== h.after_status && (
                        <span className="text-[10px] text-slate-500">
                          {STATUS_LABELS[h.before_status as RestructuringStatus] ?? h.before_status}
                          {" → "}
                          <span className="font-semibold text-brand-700">
                            {STATUS_LABELS[h.after_status as RestructuringStatus] ?? h.after_status}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-slate-400">
                      {h.user && (
                        <span className="flex items-center gap-1">
                          <User size={10} /> {h.user}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(h.at).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
