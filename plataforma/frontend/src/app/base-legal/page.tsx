"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { LegalKind, LegalNorm, Paginated } from "@/types";
import { BookOpen, Search } from "lucide-react";
import { ExportBar } from "@/components/ui/ExportBar";

const KIND_COLORS: Record<LegalKind, string> = {
  CONSTITUCION: "bg-indigo-100 text-indigo-800",
  LEY: "bg-brand-100 text-brand-800",
  DECRETO: "bg-emerald-100 text-emerald-800",
  RESOLUCION: "bg-amber-100 text-amber-800",
  SENTENCIA_CC: "bg-red-100 text-red-800",
  SENTENCIA_CE: "bg-red-100 text-red-800",
  CONPES: "bg-slate-200 text-slate-800",
  OTRO: "bg-slate-200 text-slate-700",
};

export default function BaseLegalPage() {
  const [norms, setNorms] = useState<LegalNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<LegalKind | "">("");

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<LegalNorm>>("/base-legal/", { page_size: 200 })
      .then((d) => setNorms(d.results))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return norms.filter((n) => {
      if (kind && n.kind !== kind) return false;
      if (!term) return true;
      return (
        n.reference.toLowerCase().includes(term) ||
        n.title.toLowerCase().includes(term) ||
        n.summary.toLowerCase().includes(term) ||
        (n.applies_to || "").toLowerCase().includes(term) ||
        (n.key_articles || "").toLowerCase().includes(term)
      );
    });
  }, [norms, q, kind]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de conocimiento legal</h1>
          <p className="text-sm text-slate-600">
            Normas y jurisprudencia de consulta obligatoria para el rediseño
            institucional (Función Pública 2018, Ley 489, Ley 790, Ley 909, CPACA,
            jurisprudencia T-014/07, T-078/09 y 0402-08).
          </p>
        </div>
        <ExportBar
          xlsxPath="/base-legal/export/xlsx/"
          docxPath="/base-legal/export/docx/"
          disabled={loading}
        />
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar norma, tema, artículo…"
            className="w-full rounded-md border border-slate-300 pl-7 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as LegalKind | "")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="CONSTITUCION">Constitución</option>
          <option value="LEY">Ley</option>
          <option value="DECRETO">Decreto</option>
          <option value="RESOLUCION">Resolución</option>
          <option value="SENTENCIA_CC">Sentencia Corte Constitucional</option>
          <option value="SENTENCIA_CE">Sentencia Consejo de Estado</option>
          <option value="CONPES">CONPES</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
          <BookOpen className="mx-auto text-slate-400" size={30} />
          <p className="mt-2 text-sm text-slate-500">
            Sin resultados. Carga el seed:{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">
              manage.py loaddata apps/legal/fixtures/seed_legal.json
            </code>
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((n) => (
            <article key={n.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                    KIND_COLORS[n.kind]
                  }
                >
                  {n.kind_display}
                </span>
                <span className="text-[11px] text-slate-500">{n.year}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{n.reference}</h3>
              <p className="text-xs font-medium text-slate-700">{n.title}</p>
              <p className="mt-2 text-xs text-slate-600">{n.summary}</p>
              {n.key_articles && (
                <p className="mt-2 text-[11px] text-slate-500">
                  <strong className="text-slate-700">Arts.:</strong> {n.key_articles}
                </p>
              )}
              {n.applies_to && (
                <p className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">Aplica a:</strong> {n.applies_to}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
