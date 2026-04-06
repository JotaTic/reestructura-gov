"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { LegacyManual, LegacyManualRole, Paginated } from "@/types";
import { ArrowLeft, ChevronDown, ChevronRight, FileStack } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";

export default function ManualVigenteDetailPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [manual, setManual] = useState<LegacyManual | null>(null);
  const [roles, setRoles] = useState<LegacyManualRole[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<LegacyManual>(`/manuales-vigentes/${id}/`),
      api.get<Paginated<LegacyManualRole>>(`/manual-vigente-cargos/`, { manual: id, page_size: 200 }),
    ])
      .then(([m, r]) => {
        setManual(m);
        setRoles(r.results);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleRole = (roleId: number) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!manual) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft size={20} />
        </button>
        <FileStack className="text-brand-600" size={22} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{manual.name}</h1>
          <p className="text-sm text-slate-500">
            {manual.act_reference} &middot; {manual.issue_date || "Sin fecha"} &middot;{" "}
            {manual.roles_count} cargos detectados
          </p>
        </div>
      </div>

      {manual.source_file_name && (
        <div className="rounded-md bg-slate-50 px-4 py-2 text-xs text-slate-600">
          Archivo importado: <strong>{manual.source_file_name}</strong>
        </div>
      )}

      {roles.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-sm text-slate-500">
            No hay cargos. Importa un DOCX desde el listado de manuales.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => {
            const isExpanded = expandedRoles.has(role.id);
            return (
              <div key={role.id} className="rounded-lg border bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => toggleRole(role.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {role.level}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {role.code}-{role.grade} &middot; {role.denomination}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{role.functions.length} funciones</span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-3">
                    {role.main_purpose && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Propósito principal</p>
                        <p className="text-sm text-slate-700">{role.main_purpose}</p>
                      </div>
                    )}
                    {role.functions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Funciones</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {role.functions.map((f) => (
                            <li key={f.id} className="text-sm text-slate-700">{f.description}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {(role.min_education || role.min_experience) && (
                      <div className="grid grid-cols-2 gap-4">
                        {role.min_education && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Educación mínima</p>
                            <p className="text-sm text-slate-700">{role.min_education}</p>
                          </div>
                        )}
                        {role.min_experience && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Experiencia mínima</p>
                            <p className="text-sm text-slate-700">{role.min_experience}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
