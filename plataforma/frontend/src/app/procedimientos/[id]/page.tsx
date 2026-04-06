"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Procedure, ProcedureStep, Paginated } from "@/types";
import {
  ArrowLeft,
  ListOrdered,
  Save,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Pencil,
  X,
} from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";

export default function ProcedimientoDetailPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

interface StepForm {
  description: string;
  role_executor: string;
  estimated_minutes: number;
  monthly_volume: number;
  input_document: string;
  output_document: string;
  supporting_system: string;
}

const emptyStepForm: StepForm = {
  description: "",
  role_executor: "",
  estimated_minutes: 0,
  monthly_volume: 0,
  input_document: "",
  output_document: "",
  supporting_system: "",
};

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<StepForm>(emptyStepForm);
  const [saving, setSaving] = useState(false);

  // New step state
  const [showNewStep, setShowNewStep] = useState(false);
  const [newForm, setNewForm] = useState<StepForm>(emptyStepForm);
  const [addingSaving, setAddingSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<Procedure>(`/procedimientos/${id}/`),
      api.get<Paginated<ProcedureStep>>(`/procedimientos-pasos/`, { procedure: id, page_size: 200 }),
    ])
      .then(([p, s]) => {
        setProcedure(p);
        setSteps(s.results.sort((a, b) => a.order - b.order));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEdit = (step: ProcedureStep) => {
    setEditingId(step.id);
    setEditForm({
      description: step.description,
      role_executor: step.role_executor,
      estimated_minutes: step.estimated_minutes,
      monthly_volume: step.monthly_volume,
      input_document: step.input_document,
      output_document: step.output_document,
      supporting_system: step.supporting_system,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyStepForm);
  };

  const saveEdit = async (stepId: number) => {
    setSaving(true);
    setError(null);
    try {
      const step = steps.find((s) => s.id === stepId)!;
      const updated = await api.put<ProcedureStep>(`/procedimientos-pasos/${stepId}/`, {
        procedure: step.procedure,
        order: step.order,
        ...editForm,
      });
      setSteps((prev) => prev.map((s) => (s.id === stepId ? updated : s)));
      setEditingId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar paso");
    } finally {
      setSaving(false);
    }
  };

  const deleteStep = async (stepId: number) => {
    if (!confirm("¿Eliminar este paso del procedimiento?")) return;
    setError(null);
    try {
      await api.delete(`/procedimientos-pasos/${stepId}/`);
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar paso");
    }
  };

  const addStep = async () => {
    setAddingSaving(true);
    setError(null);
    try {
      const maxOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order)) : 0;
      const created = await api.post<ProcedureStep>("/procedimientos-pasos/", {
        procedure: Number(id),
        order: maxOrder + 1,
        ...newForm,
      });
      setSteps((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setNewForm(emptyStepForm);
      setShowNewStep(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al agregar paso");
    } finally {
      setAddingSaving(false);
    }
  };

  const moveStep = async (stepId: number, direction: "up" | "down") => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;

    const currentStep = steps[idx];
    const swapStep = steps[swapIdx];
    setError(null);

    try {
      const [updatedCurrent, updatedSwap] = await Promise.all([
        api.put<ProcedureStep>(`/procedimientos-pasos/${currentStep.id}/`, {
          procedure: currentStep.procedure,
          order: swapStep.order,
          description: currentStep.description,
          role_executor: currentStep.role_executor,
          estimated_minutes: currentStep.estimated_minutes,
          monthly_volume: currentStep.monthly_volume,
          input_document: currentStep.input_document,
          output_document: currentStep.output_document,
          supporting_system: currentStep.supporting_system,
        }),
        api.put<ProcedureStep>(`/procedimientos-pasos/${swapStep.id}/`, {
          procedure: swapStep.procedure,
          order: currentStep.order,
          description: swapStep.description,
          role_executor: swapStep.role_executor,
          estimated_minutes: swapStep.estimated_minutes,
          monthly_volume: swapStep.monthly_volume,
          input_document: swapStep.input_document,
          output_document: swapStep.output_document,
          supporting_system: swapStep.supporting_system,
        }),
      ]);
      setSteps((prev) =>
        prev
          .map((s) => {
            if (s.id === updatedCurrent.id) return updatedCurrent;
            if (s.id === updatedSwap.id) return updatedSwap;
            return s;
          })
          .sort((a, b) => a.order - b.order)
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al reordenar paso");
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Cargando...</div>;
  if (error && !procedure) return <div className="p-6 text-sm text-red-600">{error}</div>;
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

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {steps.length === 0 && !showNewStep ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-slate-500">
          No hay pasos registrados para este procedimiento.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-2 py-3 text-center w-10">#</th>
                <th className="px-3 py-3 text-center w-16">Orden</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-3 py-3 text-center">Min.</th>
                <th className="px-3 py-3 text-center">Vol./mes</th>
                <th className="px-4 py-3 text-left">Sistema</th>
                <th className="px-3 py-3 text-right w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {steps.map((s, idx) =>
                editingId === s.id ? (
                  <tr key={s.id} className="bg-blue-50">
                    <td className="px-2 py-2 text-center font-mono text-xs text-slate-400">{s.order}</td>
                    <td className="px-3 py-2" />
                    <td className="px-4 py-2">
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full rounded border px-2 py-1 text-sm"
                        rows={2}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.role_executor}
                        onChange={(e) => setEditForm({ ...editForm, role_executor: e.target.value })}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editForm.estimated_minutes}
                        onChange={(e) => setEditForm({ ...editForm, estimated_minutes: Number(e.target.value) })}
                        className="w-16 rounded border px-2 py-1 text-sm text-center"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editForm.monthly_volume}
                        onChange={(e) => setEditForm({ ...editForm, monthly_volume: Number(e.target.value) })}
                        className="w-16 rounded border px-2 py-1 text-sm text-center"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={editForm.supporting_system}
                        onChange={(e) => setEditForm({ ...editForm, supporting_system: e.target.value })}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => saveEdit(s.id)}
                          disabled={saving}
                          className="text-brand-700 hover:text-brand-900 disabled:text-slate-300"
                          title="Guardar"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-slate-500 hover:text-slate-700"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="hover:bg-slate-50 group">
                    <td className="px-2 py-3 text-center font-mono text-xs text-slate-400">{s.order}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => moveStep(s.id, "up")}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Subir"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => moveStep(s.id, "down")}
                          disabled={idx === steps.length - 1}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Bajar"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.description}</td>
                    <td className="px-4 py-3 text-slate-500">{s.role_executor || "—"}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{s.estimated_minutes || "—"}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{s.monthly_volume || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{s.supporting_system || "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-brand-600 hover:text-brand-800"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => deleteStep(s.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new step */}
      {showNewStep ? (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Agregar nuevo paso</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
                rows={2}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsable</label>
              <input
                value={newForm.role_executor}
                onChange={(e) => setNewForm({ ...newForm, role_executor: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sistema de soporte</label>
              <input
                value={newForm.supporting_system}
                onChange={(e) => setNewForm({ ...newForm, supporting_system: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Minutos estimados</label>
              <input
                type="number"
                value={newForm.estimated_minutes}
                onChange={(e) => setNewForm({ ...newForm, estimated_minutes: Number(e.target.value) })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Volumen/mes</label>
              <input
                type="number"
                value={newForm.monthly_volume}
                onChange={(e) => setNewForm({ ...newForm, monthly_volume: Number(e.target.value) })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Documento entrada</label>
              <input
                value={newForm.input_document}
                onChange={(e) => setNewForm({ ...newForm, input_document: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Documento salida</label>
              <input
                value={newForm.output_document}
                onChange={(e) => setNewForm({ ...newForm, output_document: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addStep}
              disabled={!newForm.description.trim() || addingSaving}
              className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {addingSaving ? "Guardando..." : "Agregar paso"}
            </button>
            <button
              onClick={() => { setShowNewStep(false); setNewForm(emptyStepForm); }}
              className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewStep(true)}
          className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-700"
        >
          <Plus size={16} /> Agregar paso
        </button>
      )}
    </div>
  );
}
