import Link from "next/link";
import { Building2, ListChecks, ScrollText, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
          Plataforma de reestructuración
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
          ReEstructura.Gov
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Herramienta para el diseño y rediseño institucional de entidades
          públicas colombianas, alineada con la Guía de Función Pública, la Ley
          489 de 1998, la Ley 909 de 2004, la Ley 790 de 2002, el CPACA y la
          jurisprudencia vigente.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/matrices"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
        >
          <ListChecks className="text-brand-700" />
          <h3 className="mt-3 font-semibold text-slate-900">
            Matriz de Cargas de Trabajo
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Levantamiento por dependencia y por cargo, con cálculo automático
            del Tiempo Estándar (TE = [(Tmin + 4·TU + Tmax)/6] × 1.07).
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 group-hover:gap-2 transition-all">
            Abrir módulo <ArrowRight size={14} />
          </span>
        </Link>

        <Link
          href="/entidades"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
        >
          <Building2 className="text-brand-700" />
          <h3 className="mt-3 font-semibold text-slate-900">Entidades</h3>
          <p className="mt-1 text-sm text-slate-600">
            Registra entidades del orden nacional, departamental, distrital o
            municipal, con su naturaleza jurídica y dependencias.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 group-hover:gap-2 transition-all">
            Administrar <ArrowRight size={14} />
          </span>
        </Link>

        <Link
          href="/nomenclatura"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
        >
          <ScrollText className="text-brand-700" />
          <h3 className="mt-3 font-semibold text-slate-900">
            Nomenclatura oficial
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Catálogo de denominaciones y códigos de empleo conforme al Decreto
            785/2005 (territorial) y Decreto 2489/2006 (nacional).
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 group-hover:gap-2 transition-all">
            Consultar <ArrowRight size={14} />
          </span>
        </Link>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <strong>Estado:</strong> MVP 1 · Módulo 10 (Matriz de Cargas) operativo.
        Los módulos de Diagnóstico, Análisis Financiero, Estructura Orgánica,
        Planta de Personal, Manual de Funciones, Retén Social y Generador de
        Actos Administrativos se desplegarán en los siguientes MVP.
      </section>
    </div>
  );
}
