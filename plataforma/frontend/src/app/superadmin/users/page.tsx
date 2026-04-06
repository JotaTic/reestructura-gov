"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  AdminGroup,
  AdminUser,
  Entity,
  Paginated,
} from "@/types";
import { ArrowLeft, KeyRound, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type Draft = {
  id?: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  groups: number[];
  allowed_entity_ids: number[];
  default_entity_id: number | null;
};

const EMPTY: Draft = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  is_active: true,
  groups: [],
  allowed_entity_ids: [],
  default_entity_id: null,
};

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, g, e] = await Promise.all([
        api.get<Paginated<AdminUser>>("/superadmin/users/", { page_size: 200 }),
        api.get<Paginated<AdminGroup>>("/superadmin/groups/", { page_size: 200 }),
        api.get<Paginated<Entity>>("/entidades/", { page_size: 200 }),
      ]);
      setUsers(u.results);
      setGroups(g.results);
      setEntities(e.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openNew = () => {
    setDraft({ ...EMPTY });
    setTempPwd(null);
  };

  const openEdit = (u: AdminUser) => {
    setDraft({
      id: u.id,
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      is_active: u.is_active,
      groups: [...u.groups],
      allowed_entity_ids: u.entity_access.map((a) => a.entity),
      default_entity_id:
        u.entity_access.find((a) => a.is_default)?.entity ?? null,
    });
    setTempPwd(null);
  };

  const save = async () => {
    if (!draft) return;
    const body = { ...draft };
    try {
      if (draft.id) {
        await api.patch(`/superadmin/users/${draft.id}/`, body);
        setTempPwd(null);
      } else {
        const created = await api.post<AdminUser>("/superadmin/users/", body);
        setTempPwd(created.temporary_password ?? null);
      }
      await loadAll();
      if (!draft.id) {
        // deja abierto para mostrar password temporal
      } else {
        setDraft(null);
      }
    } catch (e) {
      alert("Error al guardar: " + (e as Error).message);
    }
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`¿Eliminar al usuario ${u.username}?`)) return;
    await api.delete(`/superadmin/users/${u.id}/`);
    await loadAll();
  };

  const resetPassword = async (u: AdminUser) => {
    if (!confirm(`¿Generar nueva contraseña temporal para ${u.username}?`)) return;
    const r = await api.post<{ temporary_password: string }>(
      `/superadmin/users/${u.id}/reset-password/`,
      {}
    );
    alert(`Nueva contraseña temporal: ${r.temporary_password}\n\nCópiala ahora; no se volverá a mostrar.`);
  };

  const allEntitiesSelected = useMemo(
    () => draft && draft.allowed_entity_ids.length === entities.length,
    [draft, entities]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={12} /> Volver
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Usuarios</h1>
        <div className="flex-1" />
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
        >
          <Plus size={12} /> Nuevo usuario
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Grupos</th>
              <th className="px-3 py-2">Entidades</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {u.username}
                  {u.is_superuser && (
                    <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
                      super
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {u.first_name} {u.last_name}
                </td>
                <td className="px-3 py-2 text-slate-600">{u.group_names.join(", ")}</td>
                <td className="px-3 py-2 text-slate-600">
                  {u.is_superuser ? "Todas" : `${u.entity_access.length}`}
                </td>
                <td className="px-3 py-2">
                  {u.is_active ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => resetPassword(u)}
                    title="Resetear contraseña"
                    className="mr-1 inline-flex items-center rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(u)}
                    title="Editar"
                    className="mr-1 inline-flex items-center rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Pencil size={14} />
                  </button>
                  {!u.is_superuser && (
                    <button
                      onClick={() => remove(u)}
                      title="Eliminar"
                      className="inline-flex items-center rounded p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Sin usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                {draft.id ? "Editar usuario" : "Nuevo usuario"}
              </h3>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setDraft(null);
                  setTempPwd(null);
                }}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {tempPwd && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="font-semibold">Contraseña temporal generada:</div>
                <code className="mt-1 block text-sm">{tempPwd}</code>
                <div className="mt-1">
                  Cópiala y entrégala al usuario. No se volverá a mostrar. El
                  usuario deberá cambiarla en su primer inicio de sesión.
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Usuario *">
                <input
                  value={draft.username}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  disabled={!!draft.id}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Nombre">
                <input
                  value={draft.first_name}
                  onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Apellido">
                <input
                  value={draft.last_name}
                  onChange={(e) => setDraft({ ...draft, last_name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Activo">
                <select
                  value={draft.is_active ? "1" : "0"}
                  onChange={(e) =>
                    setDraft({ ...draft, is_active: e.target.value === "1" })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </Field>
              <Field label="Entidad por defecto">
                <select
                  value={draft.default_entity_id ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      default_entity_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">(ninguna)</option>
                  {entities
                    .filter((e) => draft.allowed_entity_ids.includes(e.id))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-700">Grupos</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {groups.map((g) => {
                  const on = draft.groups.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          groups: on
                            ? draft.groups.filter((x) => x !== g.id)
                            : [...draft.groups, g.id],
                        })
                      }
                      className={
                        "rounded-md border px-2 py-1 text-xs " +
                        (on
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50")
                      }
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center">
                <label className="text-xs font-medium text-slate-700">Entidades permitidas</label>
                <div className="flex-1" />
                <button
                  onClick={() =>
                    setDraft({
                      ...draft,
                      allowed_entity_ids: allEntitiesSelected ? [] : entities.map((e) => e.id),
                    })
                  }
                  className="text-[10px] text-brand-700 hover:underline"
                >
                  {allEntitiesSelected ? "Deseleccionar todas" : "Seleccionar todas"}
                </button>
              </div>
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2">
                {entities.map((e) => {
                  const on = draft.allowed_entity_ids.includes(e.id);
                  return (
                    <label key={e.id} className="flex items-center gap-2 py-0.5 text-xs">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            allowed_entity_ids: on
                              ? draft.allowed_entity_ids.filter((x) => x !== e.id)
                              : [...draft.allowed_entity_ids, e.id],
                          })
                        }
                      />
                      {e.name}
                    </label>
                  );
                })}
                {entities.length === 0 && (
                  <p className="text-[11px] text-slate-500">Aún no hay entidades.</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={save}
                className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800"
              >
                <Save size={14} /> Guardar
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setTempPwd(null);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
