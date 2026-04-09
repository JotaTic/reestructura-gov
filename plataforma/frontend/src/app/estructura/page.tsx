"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Department, Paginated, PayrollPosition, PayrollPlan } from "@/types";
import { ChevronRight, GitBranch, Plus, X, Circle } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import { ExportBar } from "@/components/ui/ExportBar";
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

interface TreeNode extends Department {
  children: TreeNode[];
}

interface DeptStats {
  hasPositions: boolean;
  // Could expand later with hasFunctions etc.
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

  // Position stats for color indicators
  const [deptPositionCounts, setDeptPositionCounts] = useState<Map<number, number>>(new Map());

  // Add subdependencia form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addParentId, setAddParentId] = useState<number | null>(null);
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<Department>>("/dependencias/", { page_size: 500 })
      .then((d) => setDepts(d.results))
      .finally(() => setLoading(false));
  }, [activeEntity.id, version]);

  // Load position counts per department
  useEffect(() => {
    api
      .get<Paginated<PayrollPlan>>("/plantas/", { page_size: 20 })
      .then((plans) => {
        if (plans.results.length === 0) return;
        // Load positions from the first plan (or all)
        const promises = plans.results.map((plan) =>
          api.get<Paginated<PayrollPosition>>("/posiciones-planta/", { plan: plan.id, page_size: 1000 })
        );
        return Promise.all(promises);
      })
      .then((results) => {
        if (!results) return;
        const counts = new Map<number, number>();
        results.forEach((r) => {
          if (!r) return;
          r.results.forEach((pos) => {
            if (pos.department) {
              counts.set(pos.department, (counts.get(pos.department) || 0) + pos.quantity);
            }
          });
        });
        setDeptPositionCounts(counts);
      })
      .catch(() => {
        // Silently handle if positions endpoints are not available
      });
  }, [activeEntity.id, version]);

  const tree = useMemo(() => buildTree(depts), [depts]);

  const getDeptStats = (deptId: number): DeptStats => ({
    hasPositions: (deptPositionCounts.get(deptId) || 0) > 0,
  });

  const openAddSubdept = (parentId: number | null) => {
    setAddParentId(parentId);
    setAddName("");
    setAddCode("");
    setAddError(null);
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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estructura orgánica</h1>
          <p className="text-sm text-slate-600">
            {activeEntity.name} · {activeEntity.order_display}. Administra las
            dependencias desde{" "}
            <Link href="/dependencias" className="font-medium text-brand-700 hover:underline">
              Dependencias
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddSubdept(null)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
          >
            <Plus size={14} /> Agregar dependencia
          </button>
          <ExportBar
            xlsxPath={`/entidades/${activeEntity.id}/export-estructura/xlsx/`}
            docxPath={`/entidades/${activeEntity.id}/export-estructura/docx/`}
            disabled={loading}
          />
        </div>
      </div>

      {/* View mode tabs + Color legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Circle size={10} className="fill-green-500 text-green-500" /> Con cargos asignados</span>
          <span className="flex items-center gap-1"><Circle size={10} className="fill-amber-400 text-amber-400" /> Sin cargos</span>
        </div>
        <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => setViewMode("tree")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "tree"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Árbol
          </button>
          <button
            onClick={() => setViewMode("orgchart")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "orgchart"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Organigrama
          </button>
        </div>
      </div>

      {/* Add subdependencia modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">
                {addParentId
                  ? `Agregar subdependencia de "${depts.find((d) => d.id === addParentId)?.name}"`
                  : "Agregar dependencia raíz"}
              </h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            {addError && (
              <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{addError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  placeholder="Nombre de la dependencia"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Código (opcional)</label>
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

      {viewMode === "tree" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : tree.length === 0 ? (
            <div className="py-8 text-center">
              <GitBranch className="mx-auto text-slate-400" size={32} />
              <p className="mt-2 text-sm text-slate-500">
                Sin dependencias registradas para esta entidad.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {tree.map((node) => (
                <TreeNodeView
                  key={node.id}
                  node={node}
                  depth={0}
                  getDeptStats={getDeptStats}
                  onNavigate={(deptId) => router.push(`/dependencias?dept=${deptId}`)}
                  onAddChild={(parentId) => openAddSubdept(parentId)}
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <OrgChartView
          tree={tree}
          depts={depts}
          loading={loading}
          getDeptStats={getDeptStats}
          onNavigate={(deptId) => router.push(`/dependencias?dept=${deptId}`)}
          onAddChild={(parentId) => openAddSubdept(parentId)}
          onDeptsMoved={(updated) => {
            setDepts((prev) =>
              prev.map((d) => {
                const u = updated.find((x) => x.id === d.id);
                return u ? { ...d, parent: u.parent, order: u.order } : d;
              })
            );
          }}
        />
      )}
    </div>
  );
}

function TreeNodeView({
  node,
  depth,
  getDeptStats,
  onNavigate,
  onAddChild,
}: {
  node: TreeNode;
  depth: number;
  getDeptStats: (id: number) => DeptStats;
  onNavigate: (deptId: number) => void;
  onAddChild: (parentId: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const stats = getDeptStats(node.id);

  const statusColor = stats.hasPositions
    ? "fill-green-500 text-green-500"
    : "fill-amber-400 text-amber-400";

  return (
    <li>
      <div
        className="group flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-700">
            <ChevronRight size={14} className={"transition-transform " + (open ? "rotate-90" : "")} />
          </button>
        ) : (
          <span className="inline-block w-3.5" />
        )}
        <Circle size={8} className={statusColor} />
        <button
          onClick={() => onNavigate(node.id)}
          className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
          title="Ver dependencia"
        >
          {node.name}
        </button>
        {node.code && (
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {node.code}
          </span>
        )}
        <button
          onClick={() => onAddChild(node.id)}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-brand-600"
          title="Agregar subdependencia"
        >
          <Plus size={13} />
        </button>
      </div>
      {open && hasChildren && (
        <ul className="space-y-1">
          {node.children.map((c) => (
            <TreeNodeView
              key={c.id}
              node={c}
              depth={depth + 1}
              getDeptStats={getDeptStats}
              onNavigate={onNavigate}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ─── Hierarchical layout helper ─── */
const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;
const H_GAP = 30;
const V_GAP = 80;

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

function layoutTree(
  tree: TreeNode[],
  getDeptStats: (id: number) => DeptStats,
): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Measure subtree widths first, then position
  const widthCache = new Map<number, number>();

  function measureWidth(node: TreeNode): number {
    if (node.children.length === 0) {
      widthCache.set(node.id, NODE_WIDTH);
      return NODE_WIDTH;
    }
    const childrenWidth = node.children.reduce(
      (sum, c) => sum + measureWidth(c) + H_GAP,
      -H_GAP,
    );
    const w = Math.max(NODE_WIDTH, childrenWidth);
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
        label: node.name,
        code: node.code,
        deptId: node.id,
        hasPositions: stats.hasPositions,
        childCount: node.children.length,
      },
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: String(node.id),
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      });
    }

    if (node.children.length > 0) {
      const totalW = node.children.reduce(
        (sum, c) => sum + (widthCache.get(c.id) || NODE_WIDTH) + H_GAP,
        -H_GAP,
      );
      let cx = x + (widthCache.get(node.id) || NODE_WIDTH) / 2 - totalW / 2;
      for (const child of node.children) {
        const cw = widthCache.get(child.id) || NODE_WIDTH;
        place(child, cx, y + NODE_HEIGHT + V_GAP, String(node.id));
        cx += cw + H_GAP;
      }
    }
  }

  // Measure all roots
  tree.forEach((root) => measureWidth(root));

  // Place roots side by side
  let rx = 0;
  for (const root of tree) {
    place(root, rx, 0);
    rx += (widthCache.get(root.id) || NODE_WIDTH) + H_GAP * 2;
  }

  return { nodes, edges };
}

/* ─── Custom ReactFlow node ─── */
type DeptNodeData = {
  label: string;
  code: string;
  deptId: number;
  hasPositions: boolean;
  childCount: number;
  onNavigate?: (id: number) => void;
  onAddChild?: (id: number) => void;
};

function DeptNodeComponent({ data }: NodeProps<Node<DeptNodeData>>) {
  const borderColor = data.hasPositions ? "#22c55e" : "#f59e0b";
  return (
    <div
      className="rounded-lg bg-white px-3 py-2 shadow-md transition-shadow hover:shadow-lg"
      style={{
        border: `2px solid ${borderColor}`,
        minWidth: NODE_WIDTH,
        cursor: "grab",
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2" />
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <button
            className="text-xs font-semibold text-slate-800 hover:text-brand-700 hover:underline text-left leading-tight truncate block max-w-[160px]"
            onClick={(e) => {
              e.stopPropagation();
              data.onNavigate?.(data.deptId);
            }}
            title={data.label}
          >
            {data.label}
          </button>
          {data.code && (
            <span className="mt-0.5 inline-block rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-500">
              {data.code}
            </span>
          )}
        </div>
        <button
          className="mt-0.5 flex-shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild?.(data.deptId);
          }}
          title="Agregar subdependencia"
        >
          <Plus size={12} />
        </button>
      </div>
      {data.childCount > 0 && (
        <div className="mt-1 text-[9px] text-slate-400">{data.childCount} sub</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  deptNode: DeptNodeComponent,
};

/* ─── OrgChart View ─── */
function OrgChartView({
  tree,
  depts,
  loading,
  getDeptStats,
  onNavigate,
  onAddChild,
  onDeptsMoved,
}: {
  tree: TreeNode[];
  depts: Department[];
  loading: boolean;
  getDeptStats: (id: number) => DeptStats;
  onNavigate: (deptId: number) => void;
  onAddChild: (parentId: number) => void;
  onDeptsMoved: (updated: { id: number; parent: number | null; order: number }[]) => void;
}) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutTree(tree, getDeptStats),
    [tree, getDeptStats],
  );

  // Inject callbacks into node data
  const nodesWithCallbacks = useMemo(
    () =>
      layoutNodes.map((n) => ({
        ...n,
        data: { ...n.data, onNavigate, onAddChild },
      })),
    [layoutNodes, onNavigate, onAddChild],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync when layout changes (new deps added, etc.)
  useEffect(() => {
    setNodes(nodesWithCallbacks);
    setEdges(layoutEdges);
  }, [nodesWithCallbacks, layoutEdges, setNodes, setEdges]);

  // Handle drag end: detect reparenting via proximity
  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, draggedNode: Node) => {
      const draggedId = Number(draggedNode.id);
      const draggedCenterX = draggedNode.position.x + NODE_WIDTH / 2;
      const draggedCenterY = draggedNode.position.y + NODE_HEIGHT / 2;

      // Find closest potential parent (node that is above and close to the dragged node)
      let closestParent: number | null = null;
      let closestDist = Infinity;

      for (const n of nodes) {
        const nId = Number(n.id);
        if (nId === draggedId) continue;
        const nCenterX = n.position.x + NODE_WIDTH / 2;
        const nBottomY = n.position.y + NODE_HEIGHT;

        // Only consider nodes whose bottom is above dragged node's top
        if (nBottomY > draggedNode.position.y + NODE_HEIGHT / 2) continue;

        const dx = draggedCenterX - nCenterX;
        const dy = draggedCenterY - nBottomY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < closestDist && dist < 250) {
          closestDist = dist;
          closestParent = nId;
        }
      }

      // If no parent found nearby, check if it was dragged to root level (top area)
      if (closestParent === null && draggedNode.position.y < V_GAP / 2) {
        closestParent = null; // root
      } else if (closestParent === null) {
        // Snap back: re-layout
        const { nodes: fresh, edges: freshEdges } = layoutTree(tree, getDeptStats);
        const freshWithCb = fresh.map((n) => ({
          ...n,
          data: { ...n.data, onNavigate, onAddChild },
        }));
        setNodes(freshWithCb);
        setEdges(freshEdges);
        return;
      }

      const dept = depts.find((d) => d.id === draggedId);
      if (!dept) return;

      // If parent unchanged, just snap back
      if (dept.parent === closestParent) {
        const { nodes: fresh, edges: freshEdges } = layoutTree(tree, getDeptStats);
        const freshWithCb = fresh.map((n) => ({
          ...n,
          data: { ...n.data, onNavigate, onAddChild },
        }));
        setNodes(freshWithCb);
        setEdges(freshEdges);
        return;
      }

      // Compute new order: append at end of new siblings
      const newSiblings = depts.filter(
        (d) => d.parent === closestParent && d.id !== draggedId,
      );
      const newOrder = newSiblings.length > 0
        ? Math.max(...newSiblings.map((d) => d.order)) + 1
        : 1;

      try {
        await api.patch(`/dependencias/${draggedId}/`, {
          parent: closestParent,
          order: newOrder,
        });
        onDeptsMoved([{ id: draggedId, parent: closestParent, order: newOrder }]);
      } catch {
        // Revert on failure
        const { nodes: fresh, edges: freshEdges } = layoutTree(tree, getDeptStats);
        const freshWithCb = fresh.map((n) => ({
          ...n,
          data: { ...n.data, onNavigate, onAddChild },
        }));
        setNodes(freshWithCb);
        setEdges(freshEdges);
      }
    },
    [nodes, depts, tree, getDeptStats, onNavigate, onAddChild, setNodes, setEdges, onDeptsMoved],
  );

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Cargando...</p>
      </section>
    );
  }

  if (tree.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="py-8 text-center">
          <GitBranch className="mx-auto text-slate-400" size={32} />
          <p className="mt-2 text-sm text-slate-500">
            Sin dependencias registradas para esta entidad.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white overflow-hidden" style={{ height: "70vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls position="bottom-right" />
        <Panel position="top-left" className="rounded bg-white/80 px-2 py-1 text-[10px] text-slate-400 backdrop-blur">
          Arrastra los nodos para reorganizar la estructura
        </Panel>
      </ReactFlow>
    </section>
  );
}
