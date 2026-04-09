"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { getContextHeaders } from "@/stores/contextStore";
import { useContextStore } from "@/stores/contextStore";
import { RequireContext } from "@/components/context/RequireContext";
import { FileText, Download } from "lucide-react";

export default function EstudioTecnicoPage() {
  return <RequireContext need="restructuring"><Inner /></RequireContext>;
}

function Inner() {
  const activeRestructuring = useContextStore((s) => s.activeRestructuring)!;
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/reestructuraciones/${activeRestructuring.id}/estudio-tecnico/`, {
        credentials: "include",
        headers: { ...getContextHeaders() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estudio_tecnico_${activeRestructuring.id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Error al generar el estudio técnico.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estudio Técnico</h1>
        <p className="text-sm text-slate-600">
          Genera el documento consolidado con los 12 capítulos del estudio técnico
          de reestructuración, listo para radicar ante la DAFP.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <FileText size={48} className="mx-auto mb-4 text-brand-500" />
        <h2 className="text-lg font-semibold text-slate-900">
          {activeRestructuring.name}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          El documento incluye: identificación, acuerdo inicial, objetivos, marco legal,
          diagnóstico DOFA, procesos, cargas de trabajo, brechas, planta actual vs propuesta,
          análisis financiero, manual de funciones y actos administrativos.
        </p>
        <button
          onClick={download}
          disabled={downloading}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          <Download size={18} />
          {downloading ? "Generando documento…" : "Descargar Estudio Técnico (Word)"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
