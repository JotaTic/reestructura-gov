"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Paginated,
  RestructuringObjective,
  ObjectiveKind,
  ObjectiveDefinition,
} from "@/types";
import { ArrowLeft, Download, FileText, ListChecks, Plus } from "lucide-react";
import { useContextStore } from "@/stores/contextStore";

export default function ObjetivosPage() {
  const params = useParams();
  const restructuringId = params?.id as string;
  const activeEntity = useContextStore((s) => s.activeEntity);
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);

  const [objectives, setObjectives] = useState<RestructuringObjective[]>([]);
  const [definitions, setDefinitions] = useState<Record<ObjectiveKind, ObjectiveDefinition>>({} as Record<ObjectiveKind, ObjectiveDefinition>);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<RestructuringObjective>>({
    kind: "FORTALECIMIENTO_INSTITUCIONAL",
    description: "",
    priority: 1,
    indicator: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [studyLoading, setStudyLoading] = useState(false);

  const entityId = activeEntity?.id;
  const ridToUse = restructuringId || String(activeRestructuring?.id ?? "");

  const load = async () => {
    if (!entityId || !ridToUse) return;
    setLoading(true);
    try {
      const [objData, defData] = await Promise.all([
        api.get<Paginated<RestructuringObjective>>("/objetivos/", {}),
        api.get<Record<ObjectiveKind, ObjectiveDefinition>>("/objetivos/definitions/"),
      ]);
      setObjectives(objData.results);
      setDefinitions(defData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [entityId, ridToUse]);

  const usedKinds = new Set(objectives.map((o) => o.kind));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post<RestructuringObjective>("/objetivos/", {
        ...form,
        restructuring: Number(ridToUse),
      });
      setShowForm(false);
      setForm({ kind: "FORTALECIMIENTO_INSTITUCIONAL", description: "", priority: 1, indicator: "" });
      load();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const availableKinds = Object.entries(definitions).filter(
    ([kind]) => !usedKinds.has(kind as ObjectiveKind)
  ) as [ObjectiveKind, ObjectiveDefinition][];

  const downloadStudy = async () => {
    if (!ridToUse || !entityId) return;
    setStudyLoading(true);
    try {
      const response = await fetch(
        `/api/reestructuraciones/${ridToUse}/estudio-tecnico/`,
        {
          method: "GET",
          headers: {
            "X-Entity-Id": String(entityId),
            "X-Restructuring-Id": ridToUse,
          },
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Error al generar el estudio");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estudio_tecnico_${ridToUse}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error al descargar el estudio técnico");
    } finally {
      setStudyLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Volver
        </Link>
        <ListChecks className="text-brand-600" size={24} />
        <h1 className="text-xl font-bold">Objetivos de reestructuración</h1>
      </div>

      {!entityId || !ridToUse ? (
        <p className="text-sm text-amber-600">Selecciona una entidad y reestructuración activas para ver los objetivos.</p>
      ) : loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <>
          <div className="mb-4 flex justify-end gap-2">
            <button
              onClick={downloadStudy}
              disabled={studyLoading}
              className="flex items-center gap-1 rounded-md border border-brand-700 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 disabled:opacity-40"
            >
              <Download size={14} />
              {studyLoading ? "Generando…" : "Generar Estudio Técnico"}
            </button>
            <button
              onClick={() => setShowForm(true)}
              disabled={availableKinds.length === 0}
              className="flex items-center gap-1 rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-40"
            >
              <Plus size={14} /> Añadir objetivo
            </button>
          </div>

          {objectives.length === 0 ? (
            <p className="text-sm text-slate-500">No hay objetivos definidos para esta reestructuración.</p>
          ) : (
            <div className="space-y-3">
              {objectives.map((obj) => {
                const defn = definitions[obj.kind];
                return (
                  <div key={obj.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                          Prioridad {obj.priority}
                        </span>
                        <h3 className="font-semibold">{obj.kind_display}</h3>
                        {obj.description && <p className="mt-1 text-sm text-slate-600">{obj.description}</p>}
                      </div>
                    </div>
                    {defn && (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-medium">Insumos requeridos:</span>
                          <ul className="mt-1 list-disc pl-4 text-slate-600">
                            {defn.required_inputs.map((inp, i) => <li key={i}>{inp}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span className="font-medium">Módulos activos:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {defn.active_modules.map((m, i) => (
                              <span key={i} className="rounded bg-brand-50 px-1 py-0.5 text-brand-700">{m}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-lg font-bold">Nuevo objetivo</h2>
                {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Tipo de objetivo</label>
                    <select
                      value={form.kind}
                      onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ObjectiveKind }))}
                      className="mt-1 w-full rounded border px-2 py-2 text-sm"
                    >
                      {availableKinds.map(([kind, defn]) => (
                        <option key={kind} value={kind}>{defn.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Descripción</label>
                    <textarea
                      value={form.description ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Indicador</label>
                    <input
                      value={form.indicator ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, indicator: e.target.value }))}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Prioridad</label>
                    <input
                      type="number"
                      min={1}
                      value={form.priority ?? 1}
                      onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="rounded border px-4 py-2 text-sm">Cancelar</button>
                  <button onClick={save} disabled={saving} className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
