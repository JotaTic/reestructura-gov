"use client";

import { useState } from "react";
import { Printer, FileText, FileType, FileSpreadsheet } from "lucide-react";
import { API_URL } from "@/lib/api";
import { getContextHeaders } from "@/stores/contextStore";

/**
 * Barra de acciones de exportación común a todos los módulos.
 *
 * Props:
 *   xlsxPath / docxPath — rutas del backend que devuelven el archivo
 *                         correspondiente (sin el prefijo API_URL). Si no se
 *                         pasan, el botón respectivo no se muestra.
 *   disabled            — desactiva todos los botones (p. ej. mientras carga
 *                         el dato principal).
 *   onPrint             — override del botón imprimir. Por defecto llama a
 *                         `window.print()`. Útil si la página necesita hacer
 *                         algo antes de abrir el diálogo.
 *
 * Los botones "Imprimir" y "PDF" usan `window.print()` contra los estilos
 * @media print globales de globals.css. Para PDF se instruye al usuario a
 * elegir "Guardar como PDF" en el diálogo (no hay generación server-side).
 *
 * Los botones "Word" y "Excel" hacen un fetch autenticado (con credenciales
 * de sesión y headers de contexto X-Entity-Id / X-Restructuring-Id) y fuerzan
 * la descarga del blob resultante.
 */
export interface ExportBarProps {
  xlsxPath?: string;
  docxPath?: string;
  disabled?: boolean;
  onPrint?: () => void;
  className?: string;
  /** Texto opcional a mostrar a la izquierda de los botones. */
  label?: string;
}

export function ExportBar({
  xlsxPath,
  docxPath,
  disabled,
  onPrint,
  className,
  label,
}: ExportBarProps) {
  const [busy, setBusy] = useState<"xlsx" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerPrint = () => {
    if (disabled) return;
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const download = async (path: string, kind: "xlsx" | "docx") => {
    if (!path || disabled || busy) return;
    setError(null);
    setBusy(kind);
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept:
            kind === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ...getContextHeaders(),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Intenta extraer el filename del header Content-Disposition.
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fallback = `reporte.${kind}`;
      const filename = (match && match[1]) || fallback;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(
        kind === "xlsx"
          ? "No fue posible generar el Excel."
          : "No fue posible generar el Word.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={
        "flex flex-wrap items-center gap-2 print:hidden " + (className || "")
      }
      data-print-hide
    >
      {label && (
        <span className="mr-1 text-xs font-medium text-slate-500">{label}</span>
      )}

      <button
        type="button"
        onClick={triggerPrint}
        disabled={disabled}
        title="Imprimir el módulo"
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Printer size={14} /> Imprimir
      </button>

      <button
        type="button"
        onClick={triggerPrint}
        disabled={disabled}
        title='Abre el diálogo de impresión: elige "Guardar como PDF" como destino'
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <FileText size={14} /> PDF
      </button>

      {docxPath && (
        <button
          type="button"
          onClick={() => download(docxPath, "docx")}
          disabled={disabled || busy !== null}
          title="Descargar como documento de Word"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FileType size={14} />
          {busy === "docx" ? "Generando…" : "Word"}
        </button>
      )}

      {xlsxPath && (
        <button
          type="button"
          onClick={() => download(xlsxPath, "xlsx")}
          disabled={disabled || busy !== null}
          title="Descargar como hoja de cálculo Excel"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FileSpreadsheet size={14} />
          {busy === "xlsx" ? "Generando…" : "Excel"}
        </button>
      )}

      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
