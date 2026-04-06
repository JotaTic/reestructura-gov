"use client";

/**
 * DocumentList
 *
 * Componente reutilizable que muestra y permite subir documentos vinculados
 * a cualquier objeto de la plataforma mediante el API de Gestión Documental.
 *
 * Props:
 *   targetModel: string en formato "app_label.ModelName" (ej. "core.restructuring")
 *   targetId:    id del objeto
 *   entityId:    id de la entidad (para la cabecera X-Entity-Id)
 *
 * Uso:
 *   <DocumentList targetModel="diagnostico.diagnosis" targetId={diagnosis.id} entityId={entity.id} />
 */

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { DocumentItem, DocumentKind, Paginated } from "@/types";
import { FileText, Upload } from "lucide-react";
import { useContextStore } from "@/stores/contextStore";

const DOCUMENT_KIND_LABELS: Record<string, string> = {
  ACTO_ESTRUCTURA: "Acto de estructura",
  ACTO_PLANTA: "Acto de planta",
  MANUAL_VIGENTE: "Manual vigente",
  PROCEDIMIENTO: "Procedimiento",
  HOJA_DE_VIDA: "Hoja de vida",
  OFICIO_DAFP: "Oficio DAFP",
  CONCEPTO_DAFP: "Concepto DAFP",
  CONCEPTO_MINHACIENDA: "Concepto Minhacienda",
  SENTENCIA: "Sentencia",
  PRESUPUESTO: "Presupuesto",
  MFMP_HISTORICO: "MFMP histórico",
  OTRO: "Otro",
};

interface DocumentListProps {
  targetModel?: string;
  targetId?: number;
  entityId?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ targetModel, targetId, entityId }: DocumentListProps) {
  const contextEntity = useContextStore((s) => s.activeEntity);
  const resolvedEntityId = entityId ?? contextEntity?.id;

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadKind, setUploadKind] = useState<DocumentKind>("OTRO");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!resolvedEntityId) return;
    setLoading(true);
    const params: Record<string, string | number | undefined | null> = { page_size: 50 };
    // We rely on the entity header for filtering, plus optional content_type/object_id
    api
      .get<Paginated<DocumentItem>>("/documentos/", params)
      .then((d) => setDocuments(d.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedEntityId, targetModel, targetId]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !resolvedEntityId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("kind", uploadKind);
      formData.append("entity", String(resolvedEntityId));
      if (targetModel) formData.append("target_model", targetModel);
      if (targetId) formData.append("object_id", String(targetId));
      await api.postForm<DocumentItem>("/documentos/", formData);
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir documento");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Documentos adjuntos</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {documents.length}
          </span>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-700"
        >
          <Upload size={13} /> Subir
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</div>
      )}

      {showUpload && (
        <div className="border-b p-4 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-xs"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Nombre del documento"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select
                className="w-full rounded border px-2 py-1.5 text-xs"
                value={uploadKind}
                onChange={(e) => setUploadKind(e.target.value as DocumentKind)}
              >
                {Object.entries(DOCUMENT_KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="block w-full text-xs text-slate-600"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadTitle || uploading}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? "Subiendo..." : "Subir"}
            </button>
            <button
              onClick={() => setShowUpload(false)}
              className="rounded-md border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-3 text-xs text-slate-500">Cargando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-400">
          No hay documentos adjuntos.
        </div>
      ) : (
        <ul className="divide-y">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">{doc.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {DOCUMENT_KIND_LABELS[doc.kind] || doc.kind} &middot; {formatSize(doc.size)} &middot; {doc.created_at.slice(0, 10)}
                  </p>
                </div>
              </div>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 shrink-0 rounded bg-brand-50 px-2 py-1 text-[10px] font-medium text-brand-700 hover:bg-brand-100"
                >
                  Descargar
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
