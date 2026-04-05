"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Paginated, ProtectedEmployee, ProtectionType } from "@/types";
import { AlertTriangle, Plus, Shield, Trash2 } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";
import { useContextStore } from "@/stores/contextStore";

const PROTECTIONS: { value: ProtectionType; label: string }[] = [
  { value: "MADRE_CABEZA", label: "Madre cabeza de familia" },
  { value: "PADRE_CABEZA", label: "Padre cabeza de familia" },
  { value: "DISCAPACIDAD", label: "Persona con discapacidad" },
  { value: "PRE_PENSIONADO", label: "Pre-pensionado" },
  { value: "EMBARAZO", label: "Empleada en embarazo" },
  { value: "LACTANCIA", label: "Empleada en lactancia" },
  { value: "FUERO_SINDICAL", label: "Empleado con fuero sindical" },
];

export default function RetenSocialPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function emptyForm(entityId: number): ProtectedEmployee {
  return {
    entity: entityId,
    full_name: "",
    id_type: "CC",
    id_number: "",
    job_denomination: "",
    department: "",
    protection_type: "MADRE_CABEZA",
    protection_start: null,
    protection_end: null,
    evidence: "",
    active: true,
    notes: "",
  };
}

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);
  const [rows, setRows] = useState<ProtectedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProtectedEmployee>(emptyForm(activeEntity.id));

  useEffect(() => {
    setForm(emptyForm(activeEntity.id));
    setLoading(true);
    api
      .get<Paginated<ProtectedEmployee>>("/reten-social/", { page_size: 200 })
      .then((d) => setRows(d.results))
      .finally(() => setLoading(false));
  }, [activeEntity.id, version]);

  const save = async () => {
    await api.post<ProtectedEmployee>("/reten-social/", {
      ...form,
      entity: activeEntity.id,
    });
    setShowForm(false);
    setForm(emptyForm(activeEntity.id));
    const d = await api.get<Paginated<ProtectedEmployee>>("/reten-social/", {
      page_size: 200,
    });
    setRows(d.results);
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar registro?")) return;
    await api.delete(`/reten-social/${id}/`);
    setRows(rows.filter((r) => r.id !== id));
  };

  const activos = rows.filter((r) => r.active).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retén social</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · Ley 790/2002 y Decreto 190/2003.
          </p>
        </div>
        <ExportBar
          xlsxPath="/reten-social/export/xlsx/"
          docxPath="/reten-social/export/docx/"
          disabled={loading}
        />
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <strong>Jurisprudencia de obligatoria consulta:</strong> Corte
            Constitucional T-014/07 y T-078/09; Consejo de Estado
            25000-23-25-000-2001-07679-02(0402-08). La supresión de empleos que
            afecte a estos sujetos debe garantizar estabilidad laboral reforzada y
            debido proceso (art. 44 Ley 909/2004).
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-600">
          <strong className="text-slate-900 text-lg">{activos}</strong> empleados con protección vigente
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          <Plus size={14} /> Registrar
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Nombre completo *</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Tipo doc.</label>
            <select
              value={form.id_type}
              onChange={(e) => setForm({ ...form, id_type: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option>CC</option>
              <option>CE</option>
              <option>TI</option>
              <option>PAS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Número</label>
            <input
              required
              value={form.id_number}
              onChange={(e) => setForm({ ...form, id_number: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Cargo</label>
            <input
              value={form.job_denomination}
              onChange={(e) => setForm({ ...form, job_denomination: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Dependencia</label>
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Tipo de protección *</label>
            <select
              value={form.protection_type}
              onChange={(e) =>
                setForm({ ...form, protection_type: e.target.value as ProtectionType })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {PROTECTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Inicio</label>
            <input
              type="date"
              value={form.protection_start ?? ""}
              onChange={(e) => setForm({ ...form, protection_start: e.target.value || null })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Fin estimado</label>
            <input
              type="date"
              value={form.protection_end ?? ""}
              onChange={(e) => setForm({ ...form, protection_end: e.target.value || null })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Soporte documental</label>
            <textarea
              value={form.evidence}
              onChange={(e) => setForm({ ...form, evidence: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="mx-auto text-slate-400" size={32} />
            <p className="mt-2 text-sm text-slate-500">Sin registros de retén social.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-600">
              <tr>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">Documento</th>
                <th className="p-2 text-left">Cargo</th>
                <th className="p-2 text-left">Dependencia</th>
                <th className="p-2 text-left">Protección</th>
                <th className="p-2 text-left">Vence</th>
                <th className="p-2 text-center">Activo</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-medium text-slate-900">{r.full_name}</td>
                  <td className="p-2">
                    {r.id_type} {r.id_number}
                  </td>
                  <td className="p-2 text-slate-600">{r.job_denomination}</td>
                  <td className="p-2 text-slate-600">{r.department}</td>
                  <td className="p-2">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                      {r.protection_type_display}
                    </span>
                  </td>
                  <td className="p-2 text-slate-600">{r.protection_end ?? "—"}</td>
                  <td className="p-2 text-center">
                    {r.active ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                    )}
                  </td>
                  <td className="p-2 text-right">
                    <button onClick={() => remove(r.id!)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
