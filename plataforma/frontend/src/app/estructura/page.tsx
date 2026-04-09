"use client";

import { useEffect, useMemo, useState, useCallback, useRef, forwardRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Department, DepartmentLevel, Paginated, PayrollPosition, PayrollPlan } from "@/types";
import {
  ChevronRight,
  GitBranch,
  Plus,
  X,
  Circle,
  Image as ImageIcon,
  FileText,
  FileType,
  Printer,
} from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import { ExportBar } from "@/components/ui/ExportBar";
import { useExportOrganigrama } from "@/hooks/useExportOrganigrama";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ─── Configuración de niveles ─── */

const LEVEL_CONFIG: Record<
  DepartmentLevel,
  { label: string; color: string; bgColor: string; borderColor: string; icon: string; shortLabel: string }
> = {
  DESPACHO:     { label: "Despacho",       color: "#7c3aed", bgColor: "#f5f3ff", borderColor: "#8b5cf6", icon: "🏛️", shortLabel: "DSP" },
  SECRETARIA:   { label: "Secretaría",     color: "#0e7490", bgColor: "#ecfeff", borderColor: "#06b6d4", icon: "📋", shortLabel: "SEC" },
  DIRECCION:    { label: "Dirección",       color: "#0369a1", bgColor: "#f0f9ff", borderColor: "#0284c7", icon: "📁", shortLabel: "DIR" },
  SUBDIRECCION: { label: "Subdirección",   color: "#0f766e", bgColor: "#f0fdfa", borderColor: "#14b8a6", icon: "📂", shortLabel: "SUB" },
  OFICINA:      { label: "Oficina",        color: "#ca8a04", bgColor: "#fefce8", borderColor: "#eab308", icon: "🗂️", shortLabel: "OFC" },
  GRUPO:        { label: "Grupo interno",  color: "#ea580c", bgColor: "#fff7ed", borderColor: "#f97316", icon: "👥", shortLabel: "GRP" },
  AREA:         { label: "Área / Unidad",  color: "#64748b", bgColor: "#f8fafc", borderColor: "#94a3b8", icon: "📌", shortLabel: "ARE" },
};

const LEVELS_ORDER: DepartmentLevel[] = [
  "DESPACHO", "SECRETARIA", "DIRECCION", "SUBDIRECCION", "OFICINA", "GRUPO", "AREA",
];

/* ─── Tipos internos ─── */

interface TreeNode extends Department {
  children: TreeNode[];
}

interface DeptStats {
  hasPositions: boolean;
  positionCount: number;
}

function buildTree(depts: Department[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  depts.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sort = (list: TreeNode[]) => {
    list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/* ─── Página principal ─── */

export default function EstructuraPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

type ViewMode = "tree" | "orgchart";

function Inner() {
  const router = useRouter();
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

  const [deptPositionCounts, setDeptPositionCounts] = useState<Map<number, number>>(new Map());

  // Formulario agregar subdependencia
  const [showAddForm, setShowAddForm] = useState(false);
  const [addParentId, setAddParentId] = useState<number | null>(null);
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addLevel, setAddLevel] = useState<DepartmentLevel>("AREA");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Exportación organigrama
  const orgchartRef = useRef<HTMLDivElement>(null);
  const entityAcronym = activeEntity.acronym || activeEntity.name.substring(0, 20);
  const { exportPNG, exportPDF, exportWord } = useExportOrganigrama(
    orgchartRef,
    `organigrama_${entityAcronym}`,
  );
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: "png" | "pdf" | "word") => {
    setExporting(type);
    try {
      if (type === "png") await exportPNG();
      else if (type === "pdf") await exportPDF();
      else await exportWord();
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<Department>>("/dependencias/", { page_size: 500 })
      .then((d) => setDepts(d.results))
      .finally(() => setLoading(false));
  }, [activeEntity.id, version]);

  useEffect(() => {
    api
      .get<Paginated<PayrollPlan>>("/plantas/", { page_size: 20 })
      .then((plans) => {
        if (plans.results.length === 0) return;
        const promises = plans.results.map((plan) =>
          api.get<Paginated<PayrollPosition>>("/posiciones-planta/", { plan: plan.id, page_size: 1000 }),
        );
        return Promise.all(promises);
      })
      .then((results) => {
        if (!results) return;
        const counts = new Map<number, number>();
        results.forEach((r) => {
          if (!r) return;
          r.results.forEach((pos) => {
            if (pos.department) counts.set(pos.department, (counts.get(pos.department) || 0) + pos.quantity);
          });
        });
        setDeptPositionCounts(counts);
      })
      .catch(() => {});
  }, [activeEntity.id, version]);

  const tree = useMemo(() => buildTree(depts), [depts]);

  const getDeptStats = useCallback(
    (deptId: number): DeptStats => ({
      hasPositions: (deptPositionCounts.get(deptId) || 0) > 0,
      positionCount: deptPositionCounts.get(deptId) || 0,
    }),
    [deptPositionCounts],
  );

  const openAddSubdept = (parentId: number | null) => {
    setAddParentId(parentId);
    setAddName("");
    setAddCode("");
    setAddError(null);
    // Auto-sugerir nivel según padre
    if (parentId) {
      const parent = depts.find((d) => d.id === parentId);
      setAddLevel(parent?.suggested_child_level || "AREA");
    } else {
      setAddLevel("DESPACHO");
    }
    setShowAddForm(true);
  };

  const handleAddSubdept = async () => {
    if (!addName.trim()) return;
    setAddSaving(true);
    setAddError(null);
    try {
      const created = await api.post<Department>("/dependencias/", {
        entity: activeEntity.id,
        name: addName.trim(),
        code: addCode.trim(),
        parent: addParentId,
        level: addLevel,
        order: depts.length + 1,
      });
      setDepts((prev) => [...prev, created]);
      setShowAddForm(false);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Error al crear subdependencia");
    } finally {
      setAddSaving(false);
    }
  };

  // Resumen por nivel
  const levelSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    depts.forEach((d) => {
      counts[d.level] = (counts[d.level] || 0) + 1;
    });
    return counts;
  }, [depts]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estructura orgánica</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · {activeEntity.order_display}.{" "}
            <Link href="/dependencias" className="font-medium text-brand-700 hover:underline">
              Editar dependencias
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddSubdept(null)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
          >
            <Plus size={14} /> Agregar dependencia
          </button>
          {viewMode === "tree" ? (
            <ExportBar
              xlsxPath={`/entidades/${activeEntity.id}/export-estructura/xlsx/`}
              docxPath={`/entidades/${activeEntity.id}/export-estructura/docx/`}
              disabled={loading}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button onClick={() => window.print()} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <Printer size={14} /> Imprimir
              </button>
              <button onClick={() => handleExport("pdf")} disabled={loading || exporting !== null} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <FileText size={14} /> {exporting === "pdf" ? "Generando…" : "PDF"}
              </button>
              <button onClick={() => handleExport("word")} disabled={loading || exporting !== null} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <FileType size={14} /> {exporting === "word" ? "Generando…" : "Word"}
              </button>
              <button onClick={() => handleExport("png")} disabled={loading || exporting !== null} className="inline-flex items-center gap-1 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 disabled:opacity-50">
                <ImageIcon size={14} /> {exporting === "png" ? "Generando…" : "PNG"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resumen por nivel + Leyenda + Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {LEVELS_ORDER.filter((l) => levelSummary[l]).map((l) => {
            const cfg = LEVEL_CONFIG[l];
            return (
              <span
                key={l}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}
              >
                {cfg.icon} {cfg.label}: {levelSummary[l]}
              </span>
            );
          })}
          <span className="ml-2 flex items-center gap-1 text-[10px] text-slate-500">
            <Circle size={8} className="fill-green-500 text-green-500" /> Con cargos
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <Circle size={8} className="fill-amber-400 text-amber-400" /> Sin cargos
          </span>
        </div>
        <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => setViewMode("tree")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === "tree" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Árbol
          </button>
          <button
            onClick={() => setViewMode("orgchart")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === "orgchart" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Organigrama
          </button>
        </div>
      </div>

      {/* Modal agregar */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                {addParentId
                  ? `Subdependencia de "${depts.find((d) => d.id === addParentId)?.name}"`
                  : "Nueva dependencia raíz"}
              </h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            {addError && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{addError}</div>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nivel organizacional</label>
                <select
                  value={addLevel}
                  onChange={(e) => setAddLevel(e.target.value as DepartmentLevel)}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                >
                  {LEVELS_ORDER.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_CONFIG[l].icon} {LEVEL_CONFIG[l].label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  Sugerido automáticamente según el nivel del padre.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  placeholder={`Nombre de la ${LEVEL_CONFIG[addLevel].label.toLowerCase()}`}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Código (opcional)</label>
                <input
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  placeholder="Ej: DG-001"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAddSubdept}
                disabled={!addName.trim() || addSaving}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {addSaving ? "Creando..." : "Crear"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="rounded-md border px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista */}
      {viewMode === "tree" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : tree.length === 0 ? (
            <div className="py-8 text-center">
              <GitBranch className="mx-auto text-slate-400" size={32} />
              <p className="mt-2 text-sm text-slate-500">Sin dependencias registradas.</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {tree.map((node) => (
                <TreeNodeView
                  key={node.id}
                  node={node}
                  depth={0}
                  getDeptStats={getDeptStats}
                  onNavigate={(id) => router.push(`/dependencias?dept=${id}`)}
                  onAddChild={(id) => openAddSubdept(id)}
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <OrgChartView
          ref={orgchartRef}
          tree={tree}
          depts={depts}
          loading={loading}
          getDeptStats={getDeptStats}
          onNavigate={(id) => router.push(`/dependencias?dept=${id}`)}
          onAddChild={(id) => openAddSubdept(id)}
          onDeptsMoved={(updated) =>
            setDepts((prev) =>
              prev.map((d) => {
                const u = updated.find((x) => x.id === d.id);
                return u ? { ...d, parent: u.parent, order: u.order } : d;
              }),
            )
          }
        />
      )}
    </div>
  );
}

/* ─── Vista de Árbol con niveles ─── */

function TreeNodeView({
  node, depth, getDeptStats, onNavigate, onAddChild,
}: {
  node: TreeNode; depth: number;
  getDeptStats: (id: number) => DeptStats;
  onNavigate: (id: number) => void;
  onAddChild: (id: number) => void;
}) {
  const [open, setOpen] = useState(depth < 3);
  const hasChildren = node.children.length > 0;
  const stats = getDeptStats(node.id);
  const cfg = LEVEL_CONFIG[node.level] || LEVEL_CONFIG.AREA;

  const posColor = stats.hasPositions ? "fill-green-500 text-green-500" : "fill-amber-400 text-amber-400";

  return (
    <li>
      <div
        className="group flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-700">
            <ChevronRight size={14} className={"transition-transform " + (open ? "rotate-90" : "")} />
          </button>
        ) : (
          <span className="inline-block w-3.5" />
        )}
        <Circle size={8} className={posColor} />
        {/* Badge de nivel */}
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold"
          style={{ backgroundColor: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}
          title={cfg.label}
        >
          {cfg.shortLabel}
        </span>
        <button
          onClick={() => onNavigate(node.id)}
          className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
          title={`${cfg.label}: ${node.name}`}
        >
          {node.name}
        </button>
        {node.code && (
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {node.code}
          </span>
        )}
        {stats.positionCount > 0 && (
          <span className="ml-1 text-[10px] text-green-600">
            ({stats.positionCount} cargo{stats.positionCount > 1 ? "s" : ""})
          </span>
        )}
        <button
          onClick={() => onAddChild(node.id)}
          className="ml-1 text-slate-400 opacity-0 transition-opacity hover:text-brand-600 group-hover:opacity-100"
          title="Agregar subdependencia"
        >
          <Plus size={13} />
        </button>
      </div>
      {open && hasChildren && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <TreeNodeView
              key={c.id} node={c} depth={depth + 1}
              getDeptStats={getDeptStats} onNavigate={onNavigate} onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ─── Layout jerárquico ─── */

const NODE_WIDTH = 230;
const NODE_HEIGHT = 76;
const H_GAP = 32;
const V_GAP = 90;

function layoutTree(tree: TreeNode[], getDeptStats: (id: number) => DeptStats): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const widthCache = new Map<number, number>();

  function measureWidth(node: TreeNode): number {
    if (node.children.length === 0) { widthCache.set(node.id, NODE_WIDTH); return NODE_WIDTH; }
    const cw = node.children.reduce((s, c) => s + measureWidth(c) + H_GAP, -H_GAP);
    const w = Math.max(NODE_WIDTH, cw);
    widthCache.set(node.id, w);
    return w;
  }

  function place(node: TreeNode, x: number, y: number, parentId?: string) {
    const stats = getDeptStats(node.id);
    nodes.push({
      id: String(node.id),
      type: "deptNode",
      position: { x, y },
      data: {
        label: node.name, code: node.code, deptId: node.id, level: node.level,
        hasPositions: stats.hasPositions, positionCount: stats.positionCount,
        childCount: node.children.length,
      },
    });
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${node.id}`, source: parentId, target: String(node.id),
        type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      });
    }
    if (node.children.length > 0) {
      const totalW = node.children.reduce((s, c) => s + (widthCache.get(c.id) || NODE_WIDTH) + H_GAP, -H_GAP);
      let cx = x + (widthCache.get(node.id) || NODE_WIDTH) / 2 - totalW / 2;
      for (const child of node.children) {
        const cw = widthCache.get(child.id) || NODE_WIDTH;
        place(child, cx, y + NODE_HEIGHT + V_GAP, String(node.id));
        cx += cw + H_GAP;
      }
    }
  }

  tree.forEach((r) => measureWidth(r));
  let rx = 0;
  for (const root of tree) { place(root, rx, 0); rx += (widthCache.get(root.id) || NODE_WIDTH) + H_GAP * 2; }
  return { nodes, edges };
}

/* ─── Nodo personalizado del organigrama ─── */

type DeptNodeData = {
  label: string; code: string; deptId: number; level: DepartmentLevel;
  hasPositions: boolean; positionCount: number; childCount: number;
  onNavigate?: (id: number) => void; onAddChild?: (id: number) => void;
};

function DeptNodeComponent({ data }: NodeProps<Node<DeptNodeData>>) {
  const cfg = LEVEL_CONFIG[data.level] || LEVEL_CONFIG.AREA;

  return (
    <div
      className="rounded-lg px-3 py-2.5 shadow-md transition-all hover:shadow-lg"
      style={{
        border: `2px solid ${cfg.borderColor}`,
        background: cfg.bgColor,
        minWidth: NODE_WIDTH,
        cursor: "grab",
      }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-300" />
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          {/* Badge de nivel */}
          <span
            className="mb-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold uppercase"
            style={{ color: cfg.color, backgroundColor: "rgba(255,255,255,0.7)", border: `1px solid ${cfg.borderColor}` }}
          >
            {cfg.icon} {cfg.label}
          </span>
          <button
            className="block max-w-[180px] truncate text-left text-xs font-semibold leading-tight text-slate-800 hover:text-brand-700 hover:underline"
            onClick={(e) => { e.stopPropagation(); data.onNavigate?.(data.deptId); }}
            title={data.label}
          >
            {data.label}
          </button>
          <div className="mt-1 flex items-center gap-1.5">
            {data.code && (
              <span className="rounded bg-white/60 px-1 py-0.5 text-[9px] text-slate-500">{data.code}</span>
            )}
            {data.positionCount > 0 ? (
              <span className="rounded bg-green-100 px-1 py-0.5 text-[9px] font-medium text-green-700">
                {data.positionCount} cargo{data.positionCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-600">sin cargos</span>
            )}
          </div>
        </div>
        <button
          className="mt-0.5 flex-shrink-0 rounded p-0.5 text-slate-400 hover:bg-white/50 hover:text-brand-600"
          onClick={(e) => { e.stopPropagation(); data.onAddChild?.(data.deptId); }}
          title="Agregar subdependencia"
        >
          <Plus size={12} />
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-300" />
    </div>
  );
}

const nodeTypes: NodeTypes = { deptNode: DeptNodeComponent };

/* ─── OrgChart View ─── */

const OrgChartView = forwardRef<HTMLDivElement, {
  tree: TreeNode[]; depts: Department[]; loading: boolean;
  getDeptStats: (id: number) => DeptStats;
  onNavigate: (id: number) => void; onAddChild: (id: number) => void;
  onDeptsMoved: (updated: { id: number; parent: number | null; order: number }[]) => void;
}>(function OrgChartViewInner({ tree, depts, loading, getDeptStats, onNavigate, onAddChild, onDeptsMoved }, ref) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => layoutTree(tree, getDeptStats), [tree, getDeptStats]);

  const nodesWithCb = useMemo(
    () => layoutNodes.map((n) => ({ ...n, data: { ...n.data, onNavigate, onAddChild } })),
    [layoutNodes, onNavigate, onAddChild],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCb);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => { setNodes(nodesWithCb); setEdges(layoutEdges); }, [nodesWithCb, layoutEdges, setNodes, setEdges]);

  const resetLayout = useCallback(() => {
    const { nodes: f, edges: fe } = layoutTree(tree, getDeptStats);
    setNodes(f.map((n) => ({ ...n, data: { ...n.data, onNavigate, onAddChild } })));
    setEdges(fe);
  }, [tree, getDeptStats, onNavigate, onAddChild, setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, draggedNode: Node) => {
      const draggedId = Number(draggedNode.id);
      const cx = draggedNode.position.x + NODE_WIDTH / 2;
      const cy = draggedNode.position.y + NODE_HEIGHT / 2;
      let closestParent: number | null = null;
      let closestDist = Infinity;
      for (const n of nodes) {
        const nId = Number(n.id);
        if (nId === draggedId) continue;
        const nBottomY = n.position.y + NODE_HEIGHT;
        if (nBottomY > draggedNode.position.y + NODE_HEIGHT / 2) continue;
        const d = Math.sqrt((cx - n.position.x - NODE_WIDTH / 2) ** 2 + (cy - nBottomY) ** 2);
        if (d < closestDist && d < 250) { closestDist = d; closestParent = nId; }
      }
      if (closestParent === null && draggedNode.position.y >= V_GAP / 2) { resetLayout(); return; }
      const dept = depts.find((d) => d.id === draggedId);
      if (!dept || dept.parent === closestParent) { resetLayout(); return; }
      const sibs = depts.filter((d) => d.parent === closestParent && d.id !== draggedId);
      const newOrder = sibs.length > 0 ? Math.max(...sibs.map((d) => d.order)) + 1 : 1;
      try {
        await api.patch(`/dependencias/${draggedId}/`, { parent: closestParent, order: newOrder });
        onDeptsMoved([{ id: draggedId, parent: closestParent, order: newOrder }]);
      } catch { resetLayout(); }
    },
    [nodes, depts, resetLayout, onDeptsMoved],
  );

  if (loading) return <section className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Cargando...</p></section>;
  if (tree.length === 0) return <section className="rounded-lg border border-slate-200 bg-white p-4"><div className="py-8 text-center"><GitBranch className="mx-auto text-slate-400" size={32} /><p className="mt-2 text-sm text-slate-500">Sin dependencias.</p></div></section>;

  return (
    <section ref={ref} className="overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ height: "70vh" }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15} maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls position="bottom-right" />
        <Panel position="top-left" className="rounded bg-white/80 px-2 py-1 text-[10px] text-slate-400 backdrop-blur">
          Arrastra nodos para reorganizar · Rueda del mouse para zoom
        </Panel>
      </ReactFlow>
    </section>
  );
});
