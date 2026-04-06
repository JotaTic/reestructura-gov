"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { RequireContext } from "@/components/context/RequireContext";
import { useContextStore } from "@/stores/contextStore";

export default function ValidacionPage() {
  return (
    <RequireContext need="entity">
      <Inner />
    </RequireContext>
  );
}

function Inner() {
  const router = useRouter();
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);
  const [customId, setCustomId] = useState("");

  const goToValidation = (id: string | number) => {
    router.push(`/validacion/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-10">
      <div className="flex items-center gap-3">
        <CheckCircle className="text-brand-700" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Validación Legal</h1>
          <p className="text-sm text-slate-600">
            Ejecuta las reglas de validación sobre una reestructuración.
          </p>
        </div>
      </div>

      {activeRestructuring && (
        <button
          onClick={() => goToValidation(activeRestructuring.id)}
          className="w-full rounded-lg border border-brand-700 bg-brand-50 p-4 text-left hover:bg-brand-100"
        >
          <p className="text-sm font-semibold text-brand-800">Validar reestructuración activa</p>
          <p className="text-xs text-brand-600 mt-1">{activeRestructuring.name} (ID: {activeRestructuring.id})</p>
        </button>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-slate-700">
          O ingresa el ID de una reestructuración:
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="ID de reestructuración"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => customId && goToValidation(customId)}
            disabled={!customId}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            Validar
          </button>
        </div>
      </div>
    </div>
  );
}
