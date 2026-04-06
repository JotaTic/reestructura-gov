"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ValidationFinding, ValidationReport } from "@/types";
import { CheckCircle, AlertTriangle, AlertCircle, Info, RefreshCw } from "lucide-react";

function FindingCard({ finding }: { finding: ValidationFinding }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3 text-xs">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
          {finding.rule_code}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-slate-900">{finding.message}</p>
          <p className="mt-0.5 text-slate-500">{finding.subject}</p>
        </div>
      </div>
    </div>
  );
}

export default function ValidationPage() {
  const params = useParams();
  const restructuringId = params?.restructuringId as string;
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ValidationReport>(
        `/validar/restructuring/${restructuringId}/`
      );
      setReport(data);
    } catch {
      setError("Error al ejecutar validaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restructuringId) load();
  }, [restructuringId]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-brand-700" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Validación Legal</h1>
            <p className="text-sm text-slate-600">
              Reestructuración #{restructuringId} — {report?.summary.total ?? 0} hallazgos
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-700 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Validando…" : "Re-validar"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && !report && (
        <p className="text-center text-sm text-slate-500 py-12">Ejecutando reglas…</p>
      )}

      {report && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{report.summary.errors}</p>
              <p className="text-xs text-red-600">Errores</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{report.summary.warnings}</p>
              <p className="text-xs text-amber-600">Advertencias</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{report.summary.info}</p>
              <p className="text-xs text-blue-600">Informativos</p>
            </div>
          </div>

          {/* Three column layout */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Errors */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <h2 className="text-sm font-semibold text-red-700">
                  Errores ({report.errors.length})
                </h2>
              </div>
              <div className="space-y-2">
                {report.errors.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin errores</p>
                ) : (
                  report.errors.map((f, i) => <FindingCard key={i} finding={f} />)
                )}
              </div>
            </div>

            {/* Warnings */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-700">
                  Advertencias ({report.warnings.length})
                </h2>
              </div>
              <div className="space-y-2">
                {report.warnings.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin advertencias</p>
                ) : (
                  report.warnings.map((f, i) => <FindingCard key={i} finding={f} />)
                )}
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Info size={16} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-blue-700">
                  Informativos ({report.info.length})
                </h2>
              </div>
              <div className="space-y-2">
                {report.info.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin informativos</p>
                ) : (
                  report.info.map((f, i) => <FindingCard key={i} finding={f} />)
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
