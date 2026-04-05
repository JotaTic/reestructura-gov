"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Department, Paginated } from "@/types";
import { ChevronRight, GitBranch } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";
import { ExportBar } from "@/components/ui/ExportBar";

interface TreeNode extends Department {
  children: TreeNode[];
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
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<Department>>("/dependencias/", { page_size: 500 })
      .then((d) => setDepts(d.results))
      .finally(() => setLoading(false));
  }, [activeEntity.id, version]);

  const tree = useMemo(() => buildTree(depts), [depts]);

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
        <ExportBar
          xlsxPath={`/entidades/${activeEntity.id}/export-estructura/xlsx/`}
          docxPath={`/entidades/${activeEntity.id}/export-estructura/docx/`}
          disabled={loading}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
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
              <TreeNodeView key={node.id} node={node} depth={0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className="flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-700">
            <ChevronRight size={14} className={"transition-transform " + (open ? "rotate-90" : "")} />
          </button>
        ) : (
          <span className="inline-block w-3.5" />
        )}
        <span className="font-medium text-slate-800">{node.name}</span>
        {node.code && (
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {node.code}
          </span>
        )}
      </div>
      {open && hasChildren && (
        <ul className="space-y-1">
          {node.children.map((c) => (
            <TreeNodeView key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
