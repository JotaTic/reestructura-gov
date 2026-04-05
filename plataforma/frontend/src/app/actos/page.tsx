"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ActDraft, ActTemplate, Paginated } from "@/types";
import { FileSignature, Sparkles } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function ActosListPage() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const activeEntity = useContextStore((s) => s.activeEntity)!;
  const activeRestructuring = useContextStore((s) => s.activeRestructuring)!;
  const version = useContextStore((s) => s.version);

  const [templates, setTemplates] = useState<ActTemplate[]>([]);
  const [drafts, setDrafts] = useState<ActDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [genTemplate, setGenTemplate] = useState<ActTemplate | null>(null);
  const [genTitle, setGenTitle] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([
        api.get<Paginated<ActTemplate>>("/plantillas-actos/", {
          is_active: "true",
          page_size: 100,
        }),
        api.get<Paginated<ActDraft>>("/actos/", { page_size: 100 }),
      ]);
      setTemplates(t.results);
      setDrafts(d.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntity.id, activeRestructuring.id, version]);

  const generate = async () => {
    if (!genTemplate) return;
    const created = await api.post<ActDraft>(
      `/plantillas-actos/${genTemplate.id}/generar-borrador/`,
      { title: genTitle || genTemplate.name }
    );
    setGenTemplate(null);
    setGenTitle("");
    setDrafts((ds) => [created, ...ds]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Actos administrativos</h1>
        <p className="text-sm text-slate-600">
          {activeEntity.name} · {activeRestructuring.name} · Fase 4 — Implementación (CPACA).
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase text-slate-500">
          Plantillas disponibles
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Sin plantillas. Ejecuta{" "}
            <code className="rounded bg-slate-100 px-1">
              manage.py loaddata apps/actos/fixtures/seed_templates.json
            </code>
            .
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-2 flex gap-2">
                  <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-800">
                    {t.kind_display}
                  </span>
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                    {t.topic_display}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                <p className="mt-1 flex-1 text-xs text-slate-500">{t.description}</p>
                <p className="mt-2 text-[10px] italic text-slate-400">{t.scope_display}</p>
                <button
                  onClick={() => {
                    setGenTemplate(t);
                    setGenTitle(t.name);
                  }}
                  className="mt-3 inline-flex items-center justify-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                >
                  <Sparkles size={12} /> Generar borrador
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {genTemplate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Generar borrador</h3>
            <p className="mt-1 text-xs text-slate-500">{genTemplate.name}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Se creará en <strong>{activeEntity.name}</strong> · {activeRestructuring.name}
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700">Título del borrador</label>
              <input
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={generate} className="flex-1 rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800">
                Generar
              </button>
              <button onClick={() => setGenTemplate(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase text-slate-500">
          Borradores ({drafts.length})
        </h2>
        {drafts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
            <FileSignature className="mx-auto text-slate-400" size={32} />
            <p className="mt-2 text-sm text-slate-500">
              Sin actos generados en esta reestructuración.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3 text-left">Título</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-900">{d.title}</td>
                    <td className="p-3 text-slate-600">
                      {d.kind_display} · {d.topic_display}
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                        {d.status_display}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/actos/${d.id}`}
                        className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
