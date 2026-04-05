"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Entity, Paginated } from "@/types";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";

const ORDER_OPTIONS = [
  { value: "NACIONAL", label: "Nacional" },
  { value: "DEPARTAMENTAL", label: "Departamental" },
  { value: "DISTRITAL", label: "Distrital" },
  { value: "MUNICIPAL", label: "Municipal" },
];

const CATEGORY_OPTIONS = [
  { value: "NA", label: "No aplica" },
  { value: "ESPECIAL", label: "Especial" },
  { value: "1", label: "Primera" },
  { value: "2", label: "Segunda" },
  { value: "3", label: "Tercera" },
  { value: "4", label: "Cuarta" },
  { value: "5", label: "Quinta" },
  { value: "6", label: "Sexta" },
];

const NATURE_OPTIONS = [
  ["MINISTERIO", "Ministerio"],
  ["DEPTO_ADMIN", "Departamento Administrativo"],
  ["ALCALDIA", "Alcaldía"],
  ["GOBERNACION", "Gobernación"],
  ["SEC_DESPACHO", "Secretaría del Despacho"],
  ["ESTAB_PUBLICO", "Establecimiento Público"],
  ["EICE", "Empresa Industrial y Comercial del Estado"],
  ["SOC_ECON_MIXTA", "Sociedad de Economía Mixta"],
  ["ESE", "Empresa Social del Estado"],
  ["ESP_SPD", "Empresa Oficial de Servicios Públicos"],
  ["UAE_SIN_PJ", "UAE sin personería"],
  ["UAE_CON_PJ", "UAE con personería"],
  ["SUPER_SIN_PJ", "Superintendencia sin personería"],
  ["SUPER_CON_PJ", "Superintendencia con personería"],
  ["INSTITUTO_CYT", "Instituto Científico y Tecnológico"],
  ["ESPECIAL", "Naturaleza especial"],
];

export default function EntidadesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    acronym: "",
    order: "MUNICIPAL",
    municipality_category: "5",
    legal_nature: "ALCALDIA",
    creation_norm: "",
    nit: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Paginated<Entity>>("/entidades/");
      setEntities(data.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post<Entity>("/entidades/", form);
    setShowForm(false);
    setForm({ ...form, name: "", acronym: "", creation_norm: "", nit: "" });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entidades</h1>
          <p className="text-sm text-slate-600">
            Registro de entidades sujetas a reestructuración.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-800"
        >
          <Plus size={16} /> Nueva entidad
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Nombre de la entidad *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Sigla</label>
            <input
              value={form.acronym}
              onChange={(e) => setForm({ ...form, acronym: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">NIT</label>
            <input
              value={form.nit}
              onChange={(e) => setForm({ ...form, nit: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Orden *</label>
            <select
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {ORDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Categoría municipal
            </label>
            <select
              value={form.municipality_category}
              onChange={(e) =>
                setForm({ ...form, municipality_category: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Naturaleza jurídica *
            </label>
            <select
              value={form.legal_nature}
              onChange={(e) => setForm({ ...form, legal_nature: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {NATURE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Norma de creación
            </label>
            <input
              value={form.creation_norm}
              onChange={(e) =>
                setForm({ ...form, creation_norm: e.target.value })
              }
              placeholder="Ej.: Ley 136 de 1994"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : entities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <Building2 className="mx-auto text-slate-400" size={36} />
          <p className="mt-2 text-sm text-slate-600">
            No hay entidades registradas aún. Crea la primera con el botón
            superior.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((e) => (
            <Link
              key={e.id}
              href={`/entidades/${e.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-500 hover:shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{e.name}</h3>
                  {e.acronym && (
                    <p className="text-xs text-slate-500">{e.acronym}</p>
                  )}
                </div>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-800">
                  {e.order_display}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {e.legal_nature_display}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Dec. {e.nomenclature_decree} · {e.departments_count}{" "}
                dependencias
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
