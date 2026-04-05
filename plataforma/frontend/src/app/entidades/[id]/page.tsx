"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type {
  Department,
  Entity,
  Paginated,
  Restructuring,
  TimelineActivity,
  TimelineStatus,
} from "@/types";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Layers,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";

type TimelineRow = TimelineActivity & { _dirty?: boolean; _tempId?: string };

const STATUS_META: Record<TimelineStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-slate-200 text-slate-700" },
  IN_PROGRESS: { label: "En curso", className: "bg-brand-100 text-brand-800" },
  DONE: { label: "Completada", className: "bg-emerald-100 text-emerald-800" },
  BLOCKED: { label: "Bloqueada", className: "bg-red-100 text-red-800" },
};

export default function EntityDetailPage() {
  const params = useParams<{ id: string }>();
  const entityId = Number(params.id);
  const activeEntity = useContextStore((s) => s.activeEntity);
  const setActiveEntity = useContextStore((s) => s.setActiveEntity);
  const setActiveRestructuring = useContextStore((s) => s.setActiveRestructuring);

  const [entity, setEntity] = useState<Entity | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [restrs, setRestrs] = useState<Restructuring[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileOk, setProfileOk] = useState(false);

  // Al entrar a esta ruta, auto-activamos la entidad en el contexto global.
  // Así el resto de la UI queda sincronizado y las cabeceras de API empiezan
  // a apuntar aquí.
  useEffect(() => {
    if (!activeEntity || activeEntity.id !== entityId) {
      api
        .get<Entity>(`/entidades/${entityId}/`)
        .then((e) => {
          setActiveEntity(e);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const load = async () => {
    setLoading(true);
    try {
      const [e, d, r, t] = await Promise.all([
        api.get<Entity>(`/entidades/${entityId}/`),
        api.get<Paginated<Department>>(`/dependencias/`, { page_size: 200 }),
        api.get<Restructuring[]>(`/entidades/${entityId}/reestructuraciones/`),
        api.get<Paginated<TimelineActivity>>(`/cronograma/`, { page_size: 200 }),
      ]);
      setEntity(e);
      setDepartments(d.results);
      setRestrs(r);
      setTimeline(t.results as TimelineRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Esperar a que la entidad esté activa en el store para que las cabeceras existan.
    if (activeEntity?.id === entityId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeEntity?.id]);

  const updateProfile = (patch: Partial<Entity>) =>
    setEntity((e) => (e ? { ...e, ...patch } : e));

  const saveProfile = async () => {
    if (!entity) return;
    setSavingProfile(true);
    setProfileOk(false);
    try {
      const updated = await api.put<Entity>(`/entidades/${entityId}/`, {
        name: entity.name,
        acronym: entity.acronym,
        order: entity.order,
        municipality_category: entity.municipality_category,
        legal_nature: entity.legal_nature,
        creation_norm: entity.creation_norm,
        nit: entity.nit,
        current_structure_act: entity.current_structure_act,
        current_payroll_act: entity.current_payroll_act,
        current_manual_act: entity.current_manual_act,
        problem_statement: entity.problem_statement,
        objectives: entity.objectives,
        approach: entity.approach,
        risks: entity.risks,
      });
      setEntity(updated);
      setActiveEntity(updated);
      setProfileOk(true);
      setTimeout(() => setProfileOk(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  };

  const activateRestr = (r: Restructuring) => {
    setActiveRestructuring(r);
  };

  // ---- Cronograma ----
  const addActivity = () => {
    const temp: TimelineRow = {
      id: 0,
      _tempId: `tmp-${Date.now()}`,
      _dirty: true,
      entity: entityId,
      name: "",
      responsible: "",
      indicator: "",
      start_date: null,
      end_date: null,
      status: "PENDING",
      status_display: "Pendiente",
      order: timeline.length + 1,
      notes: "",
    };
    setTimeline((t) => [...t, temp]);
  };

  const updateActivity = (idx: number, patch: Partial<TimelineRow>) =>
    setTimeline((t) =>
      t.map((row, i) => (i === idx ? { ...row, ...patch, _dirty: true } : row))
    );

  const removeActivity = async (idx: number) => {
    const row = timeline[idx];
    if (row.id) {
      if (!confirm("¿Eliminar esta actividad del cronograma?")) return;
      await api.delete(`/cronograma/${row.id}/`);
    }
    setTimeline((t) => t.filter((_, i) => i !== idx));
  };

  const saveTimeline = async () => {
    const dirty = timeline.filter((r) => r._dirty);
    if (dirty.length === 0) return;
    for (const row of dirty) {
      const payload = {
        entity: entityId,
        name: row.name,
        responsible: row.responsible,
        indicator: row.indicator,
        start_date: row.start_date || null,
        end_date: row.end_date || null,
        status: row.status,
        order: row.order,
        notes: row.notes,
      };
      if (row.id) {
        await api.put(`/cronograma/${row.id}/`, payload);
      } else {
        await api.post(`/cronograma/`, payload);
      }
    }
    load();
  };

  if (loading || !entity) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  const dirtyTimeline = timeline.some((r) => r._dirty);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/entidades"
          className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
        >
          <ArrowLeft size={14} /> Volver a entidades
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{entity.name}</h1>
            {entity.acronym && <p className="text-sm text-slate-500">{entity.acronym}</p>}
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase text-brand-800">
            {entity.order_display}
          </span>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ficha institucional
        </h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Field label="Naturaleza jurídica" value={entity.legal_nature_display} />
          <Field
            label="Categoría municipal"
            value={entity.municipality_category === "NA" ? "No aplica" : entity.municipality_category}
          />
          <Field label="NIT" value={entity.nit || "—"} />
          <Field label="Decreto de nomenclatura" value={entity.nomenclature_decree} />
          <Field label="Norma de creación" value={entity.creation_norm || "—"} full />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Insumos vigentes (num. 1.1)
        </h2>
        <p className="mb-4 text-[11px] text-slate-500">
          Actos administrativos que adoptan la estructura, planta y manual de funciones actualmente vigentes.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <LabeledInput label="Estructura vigente" placeholder="Decreto / Ordenanza / Acuerdo"
            value={entity.current_structure_act}
            onChange={(v) => updateProfile({ current_structure_act: v })}
          />
          <LabeledInput label="Planta de personal vigente" placeholder="Decreto / Resolución"
            value={entity.current_payroll_act}
            onChange={(v) => updateProfile({ current_payroll_act: v })}
          />
          <LabeledInput label="Manual de funciones vigente" placeholder="Acto administrativo"
            value={entity.current_manual_act}
            onChange={(v) => updateProfile({ current_manual_act: v })}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Acuerdo inicial — cuatro interrogantes (num. 1.2)
        </h2>
        <p className="mb-4 text-[11px] text-slate-500">
          Fase Previa de la Cartilla de Función Pública.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledTextarea label="1. ¿Cuál es el problema a resolver?" value={entity.problem_statement} onChange={(v) => updateProfile({ problem_statement: v })} />
          <LabeledTextarea label="2. ¿Cómo planea resolverlo?" value={entity.objectives} onChange={(v) => updateProfile({ objectives: v })} />
          <LabeledTextarea label="3. ¿Qué necesita para resolverlo?" value={entity.approach} onChange={(v) => updateProfile({ approach: v })} />
          <LabeledTextarea label="4. ¿Qué pasa si no se resuelve?" value={entity.risks} onChange={(v) => updateProfile({ risks: v })} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:bg-slate-400">
            <Save size={14} />
            {savingProfile ? "Guardando…" : "Guardar perfil"}
          </button>
          {profileOk && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={14} /> Guardado
            </span>
          )}
        </div>
      </section>

      {/* Reestructuraciones */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-500" />
            <h2 className="text-xs font-semibold uppercase text-slate-600">
              Reestructuraciones ({restrs.length})
            </h2>
          </div>
          <span className="text-[10px] text-slate-500">
            Usa el selector superior o el botón "Crear nueva reestructuración" del topbar
          </span>
        </header>
        {restrs.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            Esta entidad aún no tiene reestructuraciones. Crea una desde el selector superior.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {restrs.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{r.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {r.reference_date} · {r.status_display}
                  </div>
                </div>
                <button
                  onClick={() => activateRestr(r)}
                  className="rounded-md bg-brand-700 px-3 py-1 text-xs font-medium text-white hover:bg-brand-800"
                >
                  Activar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Cronograma */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-slate-500" />
            <h2 className="text-xs font-semibold uppercase text-slate-600">
              Cronograma de trabajo (Fase 1) · {timeline.length} actividad{timeline.length === 1 ? "" : "es"}
            </h2>
          </div>
          <div className="flex gap-2">
            {dirtyTimeline && (
              <button onClick={saveTimeline} className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800">
                <Save size={12} /> Guardar
              </button>
            )}
            <button onClick={addActivity} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Plus size={12} /> Nueva
            </button>
          </div>
        </header>
        {timeline.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-500">
            <CalendarClock className="mx-auto mb-2 text-slate-300" size={28} />
            Aún no hay actividades.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="p-2 text-left">Actividad</th>
                  <th className="p-2 text-left">Responsable</th>
                  <th className="p-2 text-left">Indicador</th>
                  <th className="p-2 text-left">Inicio</th>
                  <th className="p-2 text-left">Fin</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {timeline.map((row, idx) => (
                  <tr key={row.id || row._tempId} className={"border-t border-slate-100 " + (row._dirty ? "bg-amber-50" : "")}>
                    <td className="p-1"><CellInput value={row.name} onChange={(v) => updateActivity(idx, { name: v })} /></td>
                    <td className="p-1"><CellInput value={row.responsible} onChange={(v) => updateActivity(idx, { responsible: v })} /></td>
                    <td className="p-1"><CellInput value={row.indicator} onChange={(v) => updateActivity(idx, { indicator: v })} /></td>
                    <td className="p-1"><CellInput type="date" value={row.start_date ?? ""} onChange={(v) => updateActivity(idx, { start_date: v || null })} /></td>
                    <td className="p-1"><CellInput type="date" value={row.end_date ?? ""} onChange={(v) => updateActivity(idx, { end_date: v || null })} /></td>
                    <td className="p-1">
                      <select
                        value={row.status}
                        onChange={(e) => updateActivity(idx, { status: e.target.value as TimelineStatus })}
                        className={"w-full rounded px-1 py-1 text-[11px] font-medium " + STATUS_META[row.status].className}
                      >
                        {Object.entries(STATUS_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1 text-right">
                      <button onClick={() => removeActivity(idx)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dependencias */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-500" />
            <h2 className="text-xs font-semibold uppercase text-slate-600">
              Dependencias ({departments.length})
            </h2>
          </div>
          <Link href="/dependencias" className="text-xs font-medium text-brand-700 hover:underline">
            Administrar →
          </Link>
        </header>
        {departments.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            <Building2 className="mx-auto mb-1 text-slate-400" size={24} />
            Aún no hay dependencias registradas.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-slate-800">{d.name}</span>
                {d.code && <span className="text-[11px] text-slate-400">{d.code}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}

function LabeledTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}

function CellInput({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px]" />
  );
}
