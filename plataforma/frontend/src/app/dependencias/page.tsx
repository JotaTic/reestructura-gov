"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Department, Paginated } from "@/types";
import { Plus, Save, Trash2, Users } from "lucide-react";
import { useContextStore } from "@/stores/contextStore";
import { RequireContext } from "@/components/context/RequireContext";

type Row = Department & { _dirty?: boolean };

export default function DependenciasPage() {
  return (
    <RequireContext need="entity">
      <DependenciasInner />
    </RequireContext>
  );
}

function DependenciasInner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const version = useContextStore((s) => s.version);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<Department>>("/dependencias/", { page_size: 200 })
      .then((d) => setRows(d.results as Row[]))
      .finally(() => setLoading(false));
  }, [activeEntity.id, version]);

  const addDept = async () => {
    if (!newName.trim()) return;
    const created = await api.post<Department>("/dependencias/", {
      entity: activeEntity.id,
      name: newName.trim(),
      order: rows.length + 1,
    });
    setRows((r) => [...r, created]);
    setNewName("");
  };

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch, _dirty: true } : row)));

  const saveRow = async (idx: number) => {
    const row = rows[idx];
    if (!row._dirty) return;
    setSaving(true);
    try {
      const updated = await api.put<Department>(`/dependencias/${row.id}/`, {
        entity: row.entity,
        name: row.name,
        code: row.code,
        parent: row.parent,
        order: row.order,
      });
      setRows((r) => r.map((x, i) => (i === idx ? { ...updated, _dirty: false } : x)));
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    if (!confirm(`¿Eliminar la dependencia "${row.name}"?`)) return;
    await api.delete(`/dependencias/${row.id}/`);
    setRows((r) => r.filter((_, i) => i !== idx));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dependencias</h1>
        <p className="text-sm text-slate-600">
          Estructura orgánica de <strong>{activeEntity.name}</strong>.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <span className="text-xs font-semibold uppercase text-slate-600">
            {rows.length} dependencia{rows.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDept()}
            placeholder="Nombre de la nueva dependencia"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={addDept}
            disabled={!newName.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:bg-slate-300"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Users className="mx-auto text-slate-400" size={30} />
            <p className="mt-2 text-sm text-slate-500">
              Sin dependencias registradas para esta entidad.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left w-24">Código</th>
                <th className="p-2 text-right w-16">Orden</th>
                <th className="p-2 text-right w-28">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={"border-t border-slate-100 " + (row._dirty ? "bg-amber-50" : "")}
                >
                  <td className="p-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      value={row.code ?? ""}
                      onChange={(e) => updateRow(idx, { code: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={row.order}
                      onChange={(e) => updateRow(idx, { order: Number(e.target.value) })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-right text-sm tabular-nums"
                    />
                  </td>
                  <td className="p-2 text-right">
                    {row._dirty && (
                      <button
                        onClick={() => saveRow(idx)}
                        disabled={saving}
                        className="mr-2 text-brand-700 hover:text-brand-900 disabled:text-slate-300"
                        title="Guardar cambios"
                      >
                        <Save size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
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
