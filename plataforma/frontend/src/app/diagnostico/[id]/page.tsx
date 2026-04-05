"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Diagnosis,
  EnvDimension,
  EnvironmentAnalysis,
  LegalReference,
  Paginated,
  SwotDimension,
  SwotItem,
  SwotType,
} from "@/types";
import {
  ArrowLeft,
  Brain,
  BookOpen,
  CheckCircle2,
  Globe2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";

type Tab = "rol" | "dofa" | "legal" | "entornos";

const SWOT_TYPES: { value: SwotType; label: string; className: string }[] = [
  { value: "F", label: "Fortalezas", className: "bg-emerald-50 border-emerald-200" },
  { value: "O", label: "Oportunidades", className: "bg-sky-50 border-sky-200" },
  { value: "D", label: "Debilidades", className: "bg-amber-50 border-amber-200" },
  { value: "A", label: "Amenazas", className: "bg-red-50 border-red-200" },
];

const SWOT_DIMENSIONS: { value: SwotDimension; label: string }[] = [
  { value: "DIRECTIVA", label: "Directiva" },
  { value: "COMPETITIVA", label: "Competitiva" },
  { value: "TECNICA", label: "Técnica" },
  { value: "TECNOLOGICA", label: "Tecnológica" },
  { value: "TH", label: "Talento humano" },
];

const ENV_DIMENSIONS: { value: EnvDimension; label: string }[] = [
  { value: "ECONOMICO", label: "Económico" },
  { value: "POLITICO", label: "Político" },
  { value: "SOCIAL", label: "Social" },
  { value: "TECNOLOGICO", label: "Tecnológico" },
  { value: "CULTURAL", label: "Cultura organizacional" },
  { value: "OTRO", label: "Otro" },
];

export default function DiagnosticoEditor() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const diagId = Number(params.id);

  const [diag, setDiag] = useState<Diagnosis | null>(null);
  const [tab, setTab] = useState<Tab>("rol");
  const [swot, setSwot] = useState<SwotItem[]>([]);
  const [legal, setLegal] = useState<LegalReference[]>([]);
  const [envs, setEnvs] = useState<EnvironmentAnalysis[]>([]);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  const load = async () => {
    const d = await api.get<Diagnosis>(`/diagnosticos/${diagId}/`);
    setDiag(d);
    const [s, l, e] = await Promise.all([
      api.get<Paginated<SwotItem>>("/dofa/", { diagnosis: diagId, page_size: 500 }),
      api.get<Paginated<LegalReference>>("/marco-legal/", { diagnosis: diagId, page_size: 500 }),
      api.get<Paginated<EnvironmentAnalysis>>("/entornos/", { diagnosis: diagId, page_size: 500 }),
    ]);
    setSwot(s.results);
    setLegal(l.results);
    setEnvs(e.results);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagId]);

  const saveRole = async () => {
    if (!diag) return;
    setSaving(true);
    setOk(false);
    try {
      const updated = await api.put<Diagnosis>(`/diagnosticos/${diagId}/`, {
        entity: diag.entity,
        name: diag.name,
        reference_date: diag.reference_date,
        mission: diag.mission,
        vision: diag.vision,
        functions_analysis: diag.functions_analysis,
        duplications: diag.duplications,
        notes: diag.notes,
      });
      setDiag(updated);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!diag) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/diagnostico"
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            <ArrowLeft size={14} /> Volver
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{diag.name}</h1>
          <p className="text-sm text-slate-600">
            {diag.entity_name} · fecha {diag.reference_date}
          </p>
        </div>
        <ExportBar
          xlsxPath={`/diagnosticos/${diagId}/export/xlsx/`}
          docxPath={`/diagnosticos/${diagId}/export/docx/`}
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        <TabBtn active={tab === "rol"} onClick={() => setTab("rol")} icon={<Brain size={14} />}>
          Rol institucional
        </TabBtn>
        <TabBtn active={tab === "dofa"} onClick={() => setTab("dofa")}>
          DOFA ({swot.length})
        </TabBtn>
        <TabBtn active={tab === "legal"} onClick={() => setTab("legal")} icon={<BookOpen size={14} />}>
          Marco legal ({legal.length})
        </TabBtn>
        <TabBtn active={tab === "entornos"} onClick={() => setTab("entornos")} icon={<Globe2 size={14} />}>
          Entornos ({envs.length})
        </TabBtn>
      </div>

      {/* --- ROL --- */}
      {tab === "rol" && (
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <LabeledTextarea
            label="Misión / objeto social"
            value={diag.mission}
            onChange={(v) => setDiag({ ...diag, mission: v })}
          />
          <LabeledTextarea
            label="Visión"
            value={diag.vision}
            onChange={(v) => setDiag({ ...diag, vision: v })}
          />
          <LabeledTextarea
            label="Análisis de funciones generales"
            value={diag.functions_analysis}
            onChange={(v) => setDiag({ ...diag, functions_analysis: v })}
            placeholder="Variaciones en el tiempo, duplicidades, tercerización."
          />
          <LabeledTextarea
            label="Duplicidades identificadas"
            value={diag.duplications}
            onChange={(v) => setDiag({ ...diag, duplications: v })}
          />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              onClick={saveRole}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:bg-slate-400"
            >
              <Save size={14} /> {saving ? "Guardando…" : "Guardar"}
            </button>
            {ok && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 size={14} /> Guardado
              </span>
            )}
          </div>
        </section>
      )}

      {/* --- DOFA --- */}
      {tab === "dofa" && (
        <DofaMatrix diagnosisId={diagId} items={swot} onChange={setSwot} />
      )}

      {/* --- MARCO LEGAL --- */}
      {tab === "legal" && (
        <LegalMatrix diagnosisId={diagId} items={legal} onChange={setLegal} />
      )}

      {/* --- ENTORNOS --- */}
      {tab === "entornos" && (
        <EnvironmentsMatrix diagnosisId={diagId} items={envs} onChange={setEnvs} />
      )}
    </div>
  );
}

// ---------- DOFA ----------
function DofaMatrix({
  diagnosisId,
  items,
  onChange,
}: {
  diagnosisId: number;
  items: SwotItem[];
  onChange: (items: SwotItem[]) => void;
}) {
  const addItem = async (type: SwotType) => {
    const created = await api.post<SwotItem>("/dofa/", {
      diagnosis: diagnosisId,
      type,
      dimension: "DIRECTIVA",
      description: "",
      priority: 2,
      order: items.filter((i) => i.type === type).length + 1,
    });
    onChange([...items, created]);
  };

  const updateItem = async (id: number, patch: Partial<SwotItem>) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const updated = await api.put<SwotItem>(`/dofa/${id}/`, {
      ...current,
      ...patch,
    });
    onChange(items.map((i) => (i.id === id ? updated : i)));
  };

  const removeItem = async (id: number) => {
    if (!confirm("¿Eliminar ítem?")) return;
    await api.delete(`/dofa/${id}/`);
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SWOT_TYPES.map((t) => {
        const list = items.filter((i) => i.type === t.value);
        return (
          <section
            key={t.value}
            className={"rounded-lg border-2 p-4 " + t.className}
          >
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase text-slate-800">
                {t.label} ({list.length})
              </h3>
              <button
                onClick={() => addItem(t.value)}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Plus size={12} /> Agregar
              </button>
            </header>
            <div className="space-y-2">
              {list.length === 0 && (
                <p className="text-center text-[11px] italic text-slate-500">
                  Sin ítems
                </p>
              )}
              {list.map((item) => (
                <div key={item.id} className="rounded border border-white bg-white/70 p-2">
                  <div className="mb-1 flex gap-1">
                    <select
                      value={item.dimension}
                      onChange={(e) =>
                        updateItem(item.id!, {
                          dimension: e.target.value as SwotDimension,
                        })
                      }
                      className="flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px]"
                    >
                      {SWOT_DIMENSIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={item.priority}
                      onChange={(e) =>
                        updateItem(item.id!, {
                          priority: Number(e.target.value) as 1 | 2 | 3,
                        })
                      }
                      className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px]"
                    >
                      <option value={1}>Baja</option>
                      <option value={2}>Media</option>
                      <option value={3}>Alta</option>
                    </select>
                    <button
                      onClick={() => removeItem(item.id!)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      onChange(
                        items.map((i) =>
                          i.id === item.id ? { ...i, description: e.target.value } : i
                        )
                      )
                    }
                    onBlur={(e) => updateItem(item.id!, { description: e.target.value })}
                    rows={2}
                    className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] focus:border-brand-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------- MARCO LEGAL ----------
function LegalMatrix({
  diagnosisId,
  items,
  onChange,
}: {
  diagnosisId: number;
  items: LegalReference[];
  onChange: (items: LegalReference[]) => void;
}) {
  const add = async () => {
    const created = await api.post<LegalReference>("/marco-legal/", {
      diagnosis: diagnosisId,
      norm: "",
      article: "",
      topic: "",
      correlated_decision: "",
      order: items.length + 1,
    });
    onChange([...items, created]);
  };

  const update = async (id: number, patch: Partial<LegalReference>) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const updated = await api.put<LegalReference>(`/marco-legal/${id}/`, { ...current, ...patch });
    onChange(items.map((i) => (i.id === id ? updated : i)));
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar referencia?")) return;
    await api.delete(`/marco-legal/${id}/`);
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-600">Marco legal correlacionado</h3>
          <p className="text-[10px] text-slate-500">
            Cada norma debe estar vinculada a una decisión concreta del rediseño.
          </p>
        </div>
        <button
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800"
        >
          <Plus size={12} /> Nueva
        </button>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-600">
            <tr>
              <th className="p-2 text-left">Norma</th>
              <th className="p-2 text-left">Artículo</th>
              <th className="p-2 text-left">Tema</th>
              <th className="p-2 text-left">Decisión del rediseño que la invoca</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-xs text-slate-500">
                  Sin referencias legales
                </td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="border-t border-slate-100">
                <td className="p-1">
                  <CellInput
                    value={it.norm}
                    onBlur={(v) => update(it.id!, { norm: v })}
                  />
                </td>
                <td className="p-1">
                  <CellInput
                    value={it.article}
                    onBlur={(v) => update(it.id!, { article: v })}
                  />
                </td>
                <td className="p-1">
                  <CellInput
                    value={it.topic}
                    onBlur={(v) => update(it.id!, { topic: v })}
                  />
                </td>
                <td className="p-1">
                  <CellInput
                    value={it.correlated_decision}
                    onBlur={(v) => update(it.id!, { correlated_decision: v })}
                  />
                </td>
                <td className="p-1 text-right">
                  <button
                    onClick={() => remove(it.id!)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- ENTORNOS ----------
function EnvironmentsMatrix({
  diagnosisId,
  items,
  onChange,
}: {
  diagnosisId: number;
  items: EnvironmentAnalysis[];
  onChange: (items: EnvironmentAnalysis[]) => void;
}) {
  const add = async () => {
    const created = await api.post<EnvironmentAnalysis>("/entornos/", {
      diagnosis: diagnosisId,
      dimension: "ECONOMICO",
      description: "",
      impact: 0,
      order: items.length + 1,
    });
    onChange([...items, created]);
  };

  const update = async (id: number, patch: Partial<EnvironmentAnalysis>) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const updated = await api.put<EnvironmentAnalysis>(`/entornos/${id}/`, { ...current, ...patch });
    onChange(items.map((i) => (i.id === id ? updated : i)));
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar análisis?")) return;
    await api.delete(`/entornos/${id}/`);
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <h3 className="text-xs font-semibold uppercase text-slate-600">
          Análisis de entornos
        </h3>
        <button
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800"
        >
          <Plus size={12} /> Nuevo
        </button>
      </header>
      <div className="divide-y divide-slate-100">
        {items.length === 0 && (
          <p className="p-6 text-center text-xs text-slate-500">Sin entornos registrados</p>
        )}
        {items.map((it) => (
          <div key={it.id} className="grid gap-2 p-3 sm:grid-cols-[150px_100px_1fr_40px]">
            <select
              value={it.dimension}
              onChange={(e) =>
                update(it.id!, { dimension: e.target.value as EnvDimension })
              }
              className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px]"
            >
              {ENV_DIMENSIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <select
              value={it.impact}
              onChange={(e) =>
                update(it.id!, { impact: Number(e.target.value) as -1 | 0 | 1 })
              }
              className={
                "rounded border border-slate-200 px-2 py-1 text-[11px] font-medium " +
                (it.impact === 1
                  ? "bg-emerald-50 text-emerald-800"
                  : it.impact === -1
                  ? "bg-red-50 text-red-800"
                  : "bg-slate-50 text-slate-700")
              }
            >
              <option value={1}>Positivo</option>
              <option value={0}>Neutro</option>
              <option value={-1}>Negativo</option>
            </select>
            <textarea
              defaultValue={it.description}
              onBlur={(e) => update(it.id!, { description: e.target.value })}
              rows={2}
              className="rounded border border-slate-200 px-2 py-1 text-[11px]"
            />
            <button
              onClick={() => remove(it.id!)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Subcomponentes ----------

function TabBtn({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1 rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition " +
        (active
          ? "border-brand-700 text-brand-800"
          : "border-transparent text-slate-500 hover:text-slate-800")
      }
    >
      {icon}
      {children}
    </button>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
    </div>
  );
}

function CellInput({
  value,
  onBlur,
}: {
  value: string;
  onBlur: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v ?? ""}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onBlur(v);
      }}
      className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] focus:border-brand-500 focus:outline-none"
    />
  );
}
