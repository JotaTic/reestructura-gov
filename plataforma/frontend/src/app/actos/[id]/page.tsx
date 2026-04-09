"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ActDraft, ActStatus } from "@/types";
import { ArrowLeft, CheckCircle2, Eye, RefreshCw, Save } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { ExportBar } from "@/components/ui/ExportBar";

const STATUS: { value: ActStatus; label: string }[] = [
  { value: "DRAFT", label: "Borrador" },
  { value: "REVIEW", label: "En revisión" },
  { value: "ISSUED", label: "Expedido" },
  { value: "ARCHIVED", label: "Archivado" },
];

const STATUS_COLORS: Record<ActStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  REVIEW: "bg-amber-100 text-amber-800",
  ISSUED: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-slate-200 text-slate-600",
};

export default function ActDraftEditor() {
  return (
    <RequireContext need="restructuring">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const draftId = Number(params.id);

  const [draft, setDraft] = useState<ActDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");

  const load = async () => {
    const d = await api.get<ActDraft>(`/actos/${draftId}/`);
    setDraft(d);
  };

  useEffect(() => {
    load();
  }, [draftId]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setOk(false);
    try {
      const updated = await api.put<ActDraft>(`/actos/${draftId}/`, {
        entity: draft.entity,
        template: draft.template,
        title: draft.title,
        kind: draft.kind,
        topic: draft.topic,
        content: draft.content,
        status: draft.status,
        act_number: draft.act_number,
        issue_date: draft.issue_date,
        signed_by: draft.signed_by,
      });
      setDraft(updated);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const rerender = async () => {
    if (!draft?.template) return;
    if (!confirm("Sobrescribir el contenido con la plantilla actual y el contexto de la entidad?")) return;
    const updated = await api.post<ActDraft>(`/actos/${draftId}/re-renderizar/`, {});
    setDraft(updated);
  };

  const openPreview = async () => {
    const data = await api.get<{ rendered_content: string; title: string }>(`/actos/${draftId}/preview/`);
    setPreviewContent(data.rendered_content);
    setShowPreview(true);
  };

  const changeStatus = async (newStatus: ActStatus) => {
    if (!draft) return;
    const updated = await api.patch<ActDraft>(`/actos/${draftId}/`, { status: newStatus });
    setDraft(updated);
  };

  if (!draft) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href="/actos" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
            <ArrowLeft size={14} /> Volver a actos
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{draft.title}</h1>
          <p className="text-sm text-slate-600">
            {draft.kind_display} · {draft.topic_display} · {draft.entity_name}
          </p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[draft.status]}`}>
            {draft.status_display}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft.status === "DRAFT" && (
            <button
              onClick={() => changeStatus("REVIEW")}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Enviar a revision
            </button>
          )}
          {draft.status === "REVIEW" && (
            <button
              onClick={() => changeStatus("ISSUED")}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Expedir
            </button>
          )}
          {(draft.status === "ISSUED" || draft.status === "REVIEW") && (
            <button
              onClick={() => changeStatus("DRAFT")}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Devolver a borrador
            </button>
          )}
          {draft.status === "ISSUED" && (
            <button
              onClick={() => changeStatus("ARCHIVED")}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Archivar
            </button>
          )}
          <button
            onClick={openPreview}
            className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
          >
            <Eye size={14} /> Vista previa
          </button>
          <ExportBar
            xlsxPath={`/actos/${draftId}/export/xlsx/`}
            docxPath={`/actos/${draftId}/export/docx/`}
            pdfPath={`/actos/${draftId}/export-pdf/`}
          />
          {draft.template && (
            <button
              onClick={rerender}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} /> Re-renderizar
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:bg-slate-400"
          >
            <Save size={14} /> {saving ? "Guardando…" : "Guardar"}
          </button>
          {ok && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={14} /> Guardado
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <label className="block text-[11px] font-medium uppercase text-slate-500">Estado</label>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as ActStatus })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase text-slate-500">N° acto</label>
          <input
            value={draft.act_number}
            onChange={(e) => setDraft({ ...draft, act_number: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase text-slate-500">Fecha expedición</label>
          <input
            type="date"
            value={draft.issue_date ?? ""}
            onChange={(e) => setDraft({ ...draft, issue_date: e.target.value || null })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase text-slate-500">Firmado por</label>
          <input
            value={draft.signed_by}
            onChange={(e) => setDraft({ ...draft, signed_by: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
          <h2 className="text-xs font-semibold uppercase text-slate-600">Contenido del acto</h2>
          <p className="text-[10px] text-slate-500">
            Los marcadores como <code>[placeholder]</code> indican valores que debes completar.
          </p>
        </div>
        <textarea
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          rows={30}
          className="block w-full resize-y rounded-b-lg border-0 p-4 font-mono text-[12px] focus:outline-none focus:ring-0"
          style={{ whiteSpace: "pre-wrap" }}
        />
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Vista previa: {draft.title}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 font-serif text-[13px] leading-relaxed text-slate-800">
              {previewContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
