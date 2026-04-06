"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ChangeLogEntry, Paginated } from "@/types";
import { ArrowLeft } from "lucide-react";

export default function SuperadminAuditPage() {
  const [rows, setRows] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    app_label: "",
    model: "",
    action: "",
    user: "",
  });
  const [selected, setSelected] = useState<ChangeLogEntry | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: "200" };
      for (const [k, v] of Object.entries(filter)) if (v) params[k] = v;
      const d = await api.get<Paginated<ChangeLogEntry>>("/superadmin/audit/", params);
      setRows(d.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={12} /> Volver
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Auditoría</h1>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <FilterInput label="App" value={filter.app_label} onChange={(v) => setFilter({ ...filter, app_label: v })} />
        <FilterInput label="Modelo" value={filter.model} onChange={(v) => setFilter({ ...filter, model: v })} />
        <div>
          <label className="block text-[10px] font-medium uppercase text-slate-500">Acción</label>
          <select
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="mt-0.5 rounded-md border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="">Todas</option>
            <option value="CREATE">Creación</option>
            <option value="UPDATE">Actualización</option>
            <option value="DELETE">Eliminación</option>
          </select>
        </div>
        <FilterInput label="User id" value={filter.user} onChange={(v) => setFilter({ ...filter, user: v })} />
        <button
          onClick={load}
          className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
        >
          Aplicar
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Entidad</th>
              <th className="px-3 py-2">Modelo</th>
              <th className="px-3 py-2">Acción</th>
              <th className="px-3 py-2">#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="px-3 py-2 text-slate-600">{new Date(r.at).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-700">{r.user_username ?? "—"}</td>
                <td className="px-3 py-2 text-slate-700">{r.entity_name ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {r.app_label}.{r.model}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold " +
                      (r.action === "CREATE"
                        ? "bg-emerald-100 text-emerald-800"
                        : r.action === "UPDATE"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800")
                    }
                  >
                    {r.action_display}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{r.object_id}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Sin registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                {selected.app_label}.{selected.model} #{selected.object_id}
              </h3>
              <div className="flex-1" />
              <button
                onClick={() => setSelected(null)}
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <JsonPanel title="Antes" data={selected.before_json} />
              <JsonPanel title="Después" data={selected.after_json} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
    </div>
  );
}

function JsonPanel({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  return (
    <div className="rounded border border-slate-200 p-2">
      <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">{title}</div>
      <pre className="max-h-64 overflow-auto text-[10px] text-slate-700">
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}
