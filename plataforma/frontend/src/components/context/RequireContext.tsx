"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Building2, Layers } from "lucide-react";
import { useContextStore } from "@/stores/contextStore";

type Need = "entity" | "restructuring";

export function RequireContext({
  need,
  children,
}: {
  need: Need;
  children: ReactNode;
}) {
  const hydrated = useContextStore((s) => s.hydrated);
  const activeEntity = useContextStore((s) => s.activeEntity);
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);

  if (!hydrated) {
    return <p className="text-sm text-slate-500">Cargando contexto…</p>;
  }

  if (!activeEntity) {
    return (
      <EmptyContext
        icon={<Building2 size={40} className="text-slate-400" />}
        title="Debes seleccionar una entidad para continuar"
        description="Toda la información de la plataforma está aislada por entidad. Selecciona una desde el selector superior o crea una nueva."
        cta={
          <Link
            href="/entidades"
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Ir a Entidades
          </Link>
        }
      />
    );
  }

  if (need === "restructuring" && !activeRestructuring) {
    return (
      <EmptyContext
        icon={<Layers size={40} className="text-slate-400" />}
        title="Debes seleccionar una reestructuración para continuar"
        description={`Este módulo forma parte de un expediente de estudio técnico. Elige una reestructuración existente de ${activeEntity.name} o crea una nueva.`}
        cta={
          <Link
            href="/reestructuraciones"
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Gestionar reestructuraciones
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}

export function EmptyContext({
  icon,
  title,
  description,
  cta,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  cta?: ReactNode;
}) {
  return (
    <div className="mx-auto mt-12 max-w-xl rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}
