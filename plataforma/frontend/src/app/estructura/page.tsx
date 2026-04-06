"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Department, Paginated, PayrollPosition, PayrollPlan } from "@/types";
import { ChevronRight, GitBranch, Plus, X, Circle } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import { ExportBar } from "@/components/ui/ExportBar";

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

function Inner() {
  const router = useRouter();
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

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

      {/* Color legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Circle size={10} className="fill-green-500 text-green-500" /> Con cargos asignados</span>
        <span className="flex items-center gap-1"><Circle size={10} className="fill-amber-400 text-amber-400" /> Sin cargos</span>
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
