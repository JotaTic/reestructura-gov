"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  Paginated,
  Process,
  ProcessMap,
  ProcessType,
  ValueChainLink,
  ValueChainStage,
} from "@/types";
import { ArrowLeft, CheckCircle2, Network, Plus, Trash2, XCircle } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";

type Tab = "procesos" | "cadena";

const PROCESS_TYPES: { value: ProcessType; label: string; color: string }[] = [
  { value: "ESTRATEGICO", label: "Estratégicos", color: "bg-sky-50 border-sky-200" },
  { value: "MISIONAL", label: "Misionales", color: "bg-emerald-50 border-emerald-200" },
  { value: "APOYO", label: "Apoyo", color: "bg-amber-50 border-amber-200" },
  { value: "EVALUACION", label: "Evaluación y control", color: "bg-indigo-50 border-indigo-200" },
];

const STAGES: { value: ValueChainStage; label: string; color: string }[] = [
  { value: "INPUT", label: "Insumos", color: "bg-slate-100" },
  { value: "PROCESS", label: "Procesos", color: "bg-sky-100" },
  { value: "OUTPUT", label: "Productos", color: "bg-emerald-100" },
  { value: "OUTCOME", label: "Efectos", color: "bg-amber-100" },
  { value: "IMPACT", label: "Impactos", color: "bg-brand-100" },
];

export default function ProcessMapEditor() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const mapId = Number(params.id);

  const [map, setMap] = useState<ProcessMap | null>(null);
  const [tab, setTab] = useState<Tab>("procesos");
  const [processes, setProcesses] = useState<Process[]>([]);
  const [chain, setChain] = useState<ValueChainLink[]>([]);

  const load = async () => {
    const m = await api.get<ProcessMap>(`/mapas-procesos/${mapId}/`);
    setMap(m);
    const [p, c] = await Promise.all([
      api.get<Paginated<Process>>("/procesos/", { process_map: mapId, page_size: 500 }),
      api.get<Paginated<ValueChainLink>>("/cadena-valor/", { process_map: mapId, page_size: 500 }),
    ]);
    setProcesses(p.results);
    setChain(c.results);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  // ---- Procesos ----
  const addProcess = async (type: ProcessType) => {
    const created = await api.post<Process>("/procesos/", {
      process_map: mapId,
      code: "",
      name: "",
      type,
      description: "",
      required: true,
      executable_by_entity: true,
      duplicated: false,
      order: processes.filter((p) => p.type === type).length + 1,
    });
    setProcesses([...processes, created]);
  };

  const updateProcess = async (id: number, patch: Partial<Process>) => {
    const current = processes.find((p) => p.id === id);
    if (!current) return;
    const updated = await api.put<Process>(`/procesos/${id}/`, { ...current, ...patch });
    setProcesses(processes.map((p) => (p.id === id ? updated : p)));
  };

  const removeProcess = async (id: number) => {
    if (!confirm("¿Eliminar proceso?")) return;
    await api.delete(`/procesos/${id}/`);
    setProcesses(processes.filter((p) => p.id !== id));
  };

  // ---- Cadena ----
  const addLink = async (stage: ValueChainStage) => {
    const created = await api.post<ValueChainLink>("/cadena-valor/", {
      process_map: mapId,
      stage,
      description: "",
      related_process: null,
      order: chain.filter((l) => l.stage === stage).length + 1,
    });
    setChain([...chain, created]);
  };

  const updateLink = async (id: number, patch: Partial<ValueChainLink>) => {
    const current = chain.find((l) => l.id === id);
    if (!current) return;
    const updated = await api.put<ValueChainLink>(`/cadena-valor/${id}/`, { ...current, ...patch });
    setChain(chain.map((l) => (l.id === id ? updated : l)));
  };

  const removeLink = async (id: number) => {
    if (!confirm("¿Eliminar eslabón?")) return;
    await api.delete(`/cadena-valor/${id}/`);
    setChain(chain.filter((l) => l.id !== id));
  };

  if (!map) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/procesos" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
            <ArrowLeft size={14} /> Volver
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{map.name}</h1>
          <p className="text-sm text-slate-600">
            {map.entity_name} · {map.kind_display} · {map.reference_date}
          </p>
        </div>
        <ExportBar
          xlsxPath={`/mapas-procesos/${map.id}/export/xlsx/`}
          docxPath={`/mapas-procesos/${map.id}/export/docx/`}
        />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab("procesos")}
          className={
            "rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition " +
            (tab === "procesos"
              ? "border-brand-700 text-brand-800"
              : "border-transparent text-slate-500 hover:text-slate-800")
          }
        >
          Mapa de procesos ({processes.length})
        </button>
        <button
          onClick={() => setTab("cadena")}
          className={
            "rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition " +
            (tab === "cadena"
              ? "border-brand-700 text-brand-800"
              : "border-transparent text-slate-500 hover:text-slate-800")
          }
        >
          Cadena de valor ({chain.length})
        </button>
      </div>

      {tab === "procesos" && (
        <div className="space-y-4">
          {PROCESS_TYPES.map((pt) => {
            const list = processes.filter((p) => p.type === pt.value);
            return (
              <section key={pt.value} className={"rounded-lg border-2 p-4 " + pt.color}>
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase text-slate-800">
                    {pt.label} ({list.length})
                  </h3>
                  <button
                    onClick={() => addProcess(pt.value)}
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Plus size={12} /> Agregar
                  </button>
                </header>
                {list.length === 0 ? (
                  <p className="text-center text-[11px] italic text-slate-500">Sin procesos</p>
                ) : (
                  <div className="space-y-2">
                    {list.map((p) => (
                      <div key={p.id} className="rounded border border-white bg-white/80 p-2">
                        <div className="flex gap-2">
                          <input
                            value={p.code}
                            onBlur={(e) => {
                              if (e.target.value !== p.code)
                                updateProcess(p.id!, { code: e.target.value });
                            }}
                            onChange={(e) =>
                              setProcesses(
                                processes.map((x) =>
                                  x.id === p.id ? { ...x, code: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Código"
                            className="w-24 rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
                          />
                          <input
                            value={p.name}
                            onBlur={(e) => {
                              if (e.target.value !== p.name)
                                updateProcess(p.id!, { name: e.target.value });
                            }}
                            onChange={(e) =>
                              setProcesses(
                                processes.map((x) =>
                                  x.id === p.id ? { ...x, name: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Nombre del proceso"
                            className="flex-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium"
                          />
                          <button
                            onClick={() => removeProcess(p.id!)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <textarea
                          value={p.description}
                          onChange={(e) =>
                            setProcesses(
                              processes.map((x) =>
                                x.id === p.id ? { ...x, description: e.target.value } : x
                              )
                            )
                          }
                          onBlur={(e) => {
                            if (e.target.value !== p.description)
                              updateProcess(p.id!, { description: e.target.value });
                          }}
                          rows={2}
                          placeholder="Descripción"
                          className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px]"
                        />
                        <div className="mt-1 flex flex-wrap gap-3 text-[10px]">
                          <ToggleLabel
                            label="¿Se requiere?"
                            value={p.required}
                            onChange={(v) => updateProcess(p.id!, { required: v })}
                          />
                          <ToggleLabel
                            label="¿La ejecuta la entidad?"
                            value={p.executable_by_entity}
                            onChange={(v) => updateProcess(p.id!, { executable_by_entity: v })}
                          />
                          <ToggleLabel
                            label="¿Duplicada?"
                            value={p.duplicated}
                            onChange={(v) => updateProcess(p.id!, { duplicated: v })}
                            warn
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {tab === "cadena" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-5 gap-3">
            {STAGES.map((s) => {
              const list = chain.filter((l) => l.stage === s.value);
              return (
                <section key={s.value} className={"rounded-lg p-3 " + s.color}>
                  <header className="mb-2 flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase text-slate-800">
                      {s.label}
                    </h3>
                    <button
                      onClick={() => addLink(s.value)}
                      className="rounded bg-white p-1 text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <Plus size={10} />
                    </button>
                  </header>
                  <div className="space-y-2">
                    {list.length === 0 && (
                      <p className="text-center text-[10px] italic text-slate-500">Vacío</p>
                    )}
                    {list.map((l) => (
                      <div key={l.id} className="rounded border border-white/80 bg-white/90 p-1.5">
                        <textarea
                          defaultValue={l.description}
                          onBlur={(e) => {
                            if (e.target.value !== l.description)
                              updateLink(l.id!, { description: e.target.value });
                          }}
                          rows={3}
                          className="w-full resize-none rounded border border-slate-200 px-1.5 py-1 text-[10px]"
                        />
                        <div className="mt-1 flex justify-end">
                          <button
                            onClick={() => removeLink(l.id!)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="mt-3 text-center text-[11px] italic text-slate-500">
            Insumos → Procesos → Productos → Efectos → Impactos
          </p>
        </div>
      )}
    </div>
  );
}

function ToggleLabel({
  label,
  value,
  onChange,
  warn = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  warn?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1 rounded bg-white px-2 py-0.5 font-medium">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3"
      />
      <span className={warn && value ? "text-red-700" : "text-slate-700"}>{label}</span>
      {value ? (
        <CheckCircle2 size={11} className={warn ? "text-red-600" : "text-emerald-600"} />
      ) : (
        <XCircle size={11} className="text-slate-400" />
      )}
    </label>
  );
}
