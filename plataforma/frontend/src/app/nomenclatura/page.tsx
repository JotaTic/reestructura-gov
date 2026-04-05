"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { JobNomenclature } from "@/types";

export default function NomenclaturaPage() {
  const [items, setItems] = useState<JobNomenclature[]>([]);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"" | "NACIONAL" | "TERRITORIAL">("TERRITORIAL");

  useEffect(() => {
    api.get<JobNomenclature[]>("/nomenclatura/").then(setItems);
  }, []);

  const filtered = items.filter(
    (i) =>
      (scope === "" || i.scope === scope) &&
      (q === "" ||
        i.denomination.toLowerCase().includes(q.toLowerCase()) ||
        i.code.includes(q))
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Nomenclatura oficial</h1>
      <p className="text-sm text-slate-600">
        Catálogo de denominaciones y códigos de empleo (Decreto 785/2005 ·
        Decreto 2489/2006).
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por denominación o código…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "" | "NACIONAL" | "TERRITORIAL")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="TERRITORIAL">Territorial (785/2005)</option>
          <option value="NACIONAL">Nacional (2489/2006)</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-left">Denominación</th>
              <th className="p-2 text-left">Nivel</th>
              <th className="p-2 text-left">Ámbito</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-2 font-mono">{i.code}</td>
                <td className="p-2">{i.denomination}</td>
                <td className="p-2">{i.level_display}</td>
                <td className="p-2 text-xs text-slate-500">{i.scope_display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
