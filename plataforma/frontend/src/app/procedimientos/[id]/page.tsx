"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Procedure, ProcedureStep, Paginated } from "@/types";
import { ArrowLeft, ListOrdered } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";

export default function ProcedimientoDetailPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Procedure>(`/procedimientos/${id}/`),
      api.get<Paginated<ProcedureStep>>(`/procedimientos-pasos/`, { procedure: id, page_size: 200 }),
    ])
      .then(([p, s]) => {
        setProcedure(p);
        setSteps(s.results);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!procedure) return null;

  const totalMinutes = steps.reduce((sum, s) => sum + s.estimated_minutes, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft size={20} />
        </button>
        <ListOrdered className="text-brand-600" size={22} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{procedure.name}</h1>
          <p className="text-sm text-slate-500">
            {procedure.code} · v{procedure.version} · Proceso: {procedure.process_name} ·{" "}
            {steps.length} pasos · {Math.round(totalMinutes / 60 * 10) / 10}h estimadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {procedure.objective && (
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Objetivo</p>
            <p className="text-sm text-slate-700">{procedure.objective}</p>
          </div>
        )}
        {procedure.scope && (
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Alcance</p>
            <p className="text-sm text-slate-700">{procedure.scope}</p>
          </div>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-slate-500">
          No hay pasos registrados para este procedimiento.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-3 text-center w-12">#</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-3 py-3 text-center">Min.</th>
                <th className="px-3 py-3 text-center">Vol./mes</th>
                <th className="px-4 py-3 text-left">Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {steps.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 text-center font-mono text-xs text-slate-400">{s.order}</td>
                  <td className="px-4 py-3 text-slate-700">{s.description}</td>
                  <td className="px-4 py-3 text-slate-500">{s.role_executor || "—"}</td>
                  <td className="px-3 py-3 text-center text-slate-500">{s.estimated_minutes || "—"}</td>
                  <td className="px-3 py-3 text-center text-slate-500">{s.monthly_volume || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.supporting_system || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
