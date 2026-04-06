"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { MatrixCell, MatrixResponse, MatrixRow } from "@/types";
import { ArrowLeft, RefreshCcw, Save } from "lucide-react";

const BITS: Array<{ key: keyof Pick<MatrixCell, "can_create" | "can_read" | "can_update" | "can_delete">; label: string }> = [
  { key: "can_create", label: "C" },
  { key: "can_read", label: "R" },
  { key: "can_update", label: "U" },
  { key: "can_delete", label: "D" },
];

export default function SuperadminPermissionsPage() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [openApps, setOpenApps] = useState<Set<string>>(new Set());

  const load = async () => {
    const d = await api.get<MatrixResponse>("/superadmin/permissions/matrix/");
    setData(d);
    setDirtyRows(new Set());
    setOpenApps(new Set(d.models.map((m) => m.app_label)));
  };

  useEffect(() => {
    load();
  }, []);

  const byApp = useMemo(() => {
    const map = new Map<string, MatrixRow[]>();
    if (!data) return map;
    for (const row of data.models) {
      if (filter && !(`${row.app_label}.${row.model}`.toLowerCase().includes(filter.toLowerCase()) || row.verbose_name.toLowerCase().includes(filter.toLowerCase())))
        continue;
      const arr = map.get(row.app_label) || [];
      arr.push(row);
      map.set(row.app_label, arr);
    }
    return map;
  }, [data, filter]);

  const toggleCell = (
    rowKey: string,
    groupId: number,
    bit: keyof MatrixCell
  ) => {
    if (!data) return;
    const next = { ...data, models: data.models.map((r) => ({ ...r, cells: r.cells.map((c) => ({ ...c })) })) };
    const row = next.models.find((r) => `${r.app_label}.${r.model}` === rowKey);
    if (!row) return;
    const cell = row.cells.find((c) => c.group_id === groupId);
    if (!cell) return;
    (cell as unknown as Record<string, boolean>)[bit] = !(cell as unknown as Record<string, boolean>)[bit];
    setData(next);
    setDirtyRows(new Set([...dirtyRows, rowKey]));
  };

  const saveAll = async () => {
    if (!data) return;
    setSaving(true);
    try {
      for (const rowKey of dirtyRows) {
        const row = data.models.find((r) => `${r.app_label}.${r.model}` === rowKey);
        if (!row) continue;
        await api.post("/superadmin/permissions/bulk-save/", {
          app_label: row.app_label,
          model: row.model,
          cells: row.cells,
        });
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!confirm("¿Restablecer toda la matriz a los valores por defecto? Se perderán los cambios manuales.")) return;
    await api.post("/superadmin/permissions/reset-defaults/", {});
    await load();
  };

  if (!data) return <div className="p-6 text-sm text-slate-500">Cargando matriz…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={12} /> Volver
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Matriz de permisos CRUD</h1>
        <div className="flex-1" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar modelo…"
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          onClick={resetDefaults}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw size={12} /> Restablecer
        </button>
        <button
          onClick={saveAll}
          disabled={dirtyRows.size === 0 || saving}
          className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:bg-slate-300"
        >
          <Save size={12} /> Guardar {dirtyRows.size > 0 && `(${dirtyRows.size})`}
        </button>
      </div>

      <div className="space-y-4">
        {Array.from(byApp.entries()).map(([app, rows]) => {
          const open = openApps.has(app);
          return (
            <div key={app} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => {
                  const next = new Set(openApps);
                  if (open) next.delete(app);
                  else next.add(app);
                  setOpenApps(next);
                }}
                className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-2 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {app} <span className="text-slate-400">({rows.length})</span>
                </span>
                <span className="text-xs text-slate-500">{open ? "▾" : "▸"}</span>
              </button>
              {open && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Modelo</th>
                        {data.groups.map((g) => (
                          <th key={g.id} className="px-2 py-2 text-center">
                            {g.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => {
                        const key = `${row.app_label}.${row.model}`;
                        const dirty = dirtyRows.has(key);
                        return (
                          <tr key={key} className={dirty ? "bg-amber-50" : ""}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800">{row.model}</div>
                              <div className="text-[10px] text-slate-500">{row.verbose_name}</div>
                            </td>
                            {data.groups.map((g) => {
                              const cell = row.cells.find((c) => c.group_id === g.id);
                              if (!cell) return <td key={g.id} />;
                              return (
                                <td key={g.id} className="px-2 py-2 text-center">
                                  <div className="inline-flex gap-0.5">
                                    {BITS.map((b) => {
                                      const on = (cell as unknown as Record<string, boolean>)[b.key];
                                      return (
                                        <button
                                          key={b.key}
                                          onClick={() => toggleCell(key, g.id, b.key)}
                                          className={
                                            "h-5 w-5 rounded text-[9px] font-bold " +
                                            (on
                                              ? "bg-brand-600 text-white"
                                              : "bg-slate-200 text-slate-500 hover:bg-slate-300")
                                          }
                                          title={b.key}
                                        >
                                          {b.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
