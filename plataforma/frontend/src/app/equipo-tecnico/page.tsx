"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RequireContext } from "@/components/context/RequireContext";
import { Plus, Trash2, Users2 } from "lucide-react";
import type { Paginated } from "@/types";

interface TeamMember {
  id: number;
  restructuring: number;
  name: string;
  position: string;
  department: string;
  role_in_team: string;
  role_display: string;
  email: string;
  phone: string;
  active: boolean;
  created_at: string;
}

const ROLES = [
  { value: "COORDINADOR", label: "Coordinador" },
  { value: "PLANEACION", label: "Planeación" },
  { value: "JURIDICO", label: "Jurídico" },
  { value: "FINANCIERO", label: "Financiero" },
  { value: "TH", label: "Talento Humano" },
  { value: "TECNICO", label: "Técnico" },
  { value: "OTRO", label: "Otro" },
];

const ROLE_COLORS: Record<string, string> = {
  COORDINADOR: "bg-violet-100 text-violet-700",
  PLANEACION: "bg-cyan-100 text-cyan-700",
  JURIDICO: "bg-amber-100 text-amber-700",
  FINANCIERO: "bg-emerald-100 text-emerald-700",
  TH: "bg-blue-100 text-blue-700",
  TECNICO: "bg-slate-100 text-slate-700",
  OTRO: "bg-gray-100 text-gray-600",
};

export default function EquipoTecnicoPage() {
  return <RequireContext need="restructuring"><Inner /></RequireContext>;
}

function Inner() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", position: "", department: "", role_in_team: "TECNICO", email: "", phone: "" });

  const load = () => {
    setLoading(true);
    api.get<Paginated<TeamMember>>("/equipo-tecnico/", { page_size: 100 })
      .then((d) => setMembers(d.results))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post("/equipo-tecnico/", form);
    setShowForm(false);
    setForm({ name: "", position: "", department: "", role_in_team: "TECNICO", email: "", phone: "" });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este miembro?")) return;
    await api.delete(`/equipo-tecnico/${id}/`);
    load();
  };

  if (loading) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo Técnico</h1>
          <p className="text-sm text-slate-600">Miembros del equipo técnico de la reestructuración.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          <Plus size={16} /> Agregar miembro
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Dependencia</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                <td className="px-4 py-3 text-slate-600">{m.position || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{m.department || "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[m.role_in_team] || ""}`}>{m.role_display}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{m.email}{m.phone && ` · ${m.phone}`}</td>
                <td className="px-4 py-3"><button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500"><Users2 size={24} className="mx-auto mb-2 text-slate-300" />No hay miembros registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Agregar miembro</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-slate-700">Nombre completo</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700">Cargo</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700">Dependencia</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700">Rol en el equipo</label><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.role_in_team} onChange={(e) => setForm({ ...form, role_in_team: e.target.value })}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700">Email</label><input type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700">Teléfono</label><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={create} disabled={!form.name} className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
