"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type { Entity, Paginated, Restructuring } from "@/types";
import { Building2, ChevronDown, Layers, LogOut, Plus, User } from "lucide-react";

export function Topbar() {
  const router = useRouter();
  const user = useContextStore((s) => s.user);
  const activeEntity = useContextStore((s) => s.activeEntity);
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);
  const setActiveEntity = useContextStore((s) => s.setActiveEntity);
  const setActiveRestructuring = useContextStore((s) => s.setActiveRestructuring);
  const clearSession = useContextStore((s) => s.clearSession);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [restrs, setRestrs] = useState<Restructuring[]>([]);
  const [openEntity, setOpenEntity] = useState(false);
  const [openRestr, setOpenRestr] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [showNewRestr, setShowNewRestr] = useState(false);
  const [newRestr, setNewRestr] = useState({
    name: "",
    reference_date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  useEffect(() => {
    if (!user) return;
    api.get<Paginated<Entity>>("/entidades/").then((d) => setEntities(d.results)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!activeEntity) {
      setRestrs([]);
      return;
    }
    api
      .get<Restructuring[]>(`/entidades/${activeEntity.id}/reestructuraciones/`)
      .then(setRestrs)
      .catch(() => setRestrs([]));
  }, [activeEntity]);

  const selectEntity = (e: Entity) => {
    setActiveEntity(e);
    setOpenEntity(false);
  };
  const selectRestr = (r: Restructuring) => {
    setActiveRestructuring(r);
    setOpenRestr(false);
  };

  const createRestr = async () => {
    if (!activeEntity || !newRestr.name) return;
    const created = await api.post<Restructuring>("/reestructuraciones/", {
      entity: activeEntity.id,
      name: newRestr.name,
      reference_date: newRestr.reference_date,
      description: newRestr.description,
    });
    setRestrs([created, ...restrs]);
    setActiveRestructuring(created);
    setShowNewRestr(false);
    setNewRestr({ name: "", reference_date: new Date().toISOString().slice(0, 10), description: "" });
  };

  const doLogout = async () => {
    try {
      await api.post("/auth/logout/", {});
    } catch {
      /* noop */
    }
    clearSession();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 lg:px-6">
      <div className="relative">
        <button
          onClick={() => {
            setOpenEntity(!openEntity);
            setOpenRestr(false);
            setOpenUser(false);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Building2 size={14} />
          {activeEntity ? (
            <>
              <span className="font-semibold text-slate-900">
                {activeEntity.acronym || activeEntity.name}
              </span>
              <span className="text-slate-500">· {activeEntity.order_display}</span>
            </>
          ) : (
            <span className="text-red-600">Sin entidad</span>
          )}
          <ChevronDown size={12} />
        </button>
        {openEntity && (
          <div className="absolute left-0 top-full z-40 mt-1 w-72 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="max-h-80 overflow-y-auto p-1">
              {entities.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">Sin entidades disponibles.</p>
              ) : (
                entities.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => selectEntity(e)}
                    className={
                      "block w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50 " +
                      (activeEntity?.id === e.id ? "bg-brand-50 text-brand-900" : "text-slate-700")
                    }
                  >
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {e.order_display} · {e.legal_nature_display}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-slate-100 p-1">
              <Link
                href="/entidades"
                onClick={() => setOpenEntity(false)}
                className="block rounded px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                Administrar entidades →
              </Link>
            </div>
          </div>
        )}
      </div>

      {activeEntity && (
        <div className="relative">
          <button
            onClick={() => {
              setOpenRestr(!openRestr);
              setOpenEntity(false);
              setOpenUser(false);
            }}
            className={
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50 " +
              (activeRestructuring
                ? "border-slate-300 bg-white text-slate-700"
                : "border-red-300 bg-red-50 text-red-700")
            }
          >
            <Layers size={14} />
            {activeRestructuring ? (
              <>
                <span className="font-semibold text-slate-900">{activeRestructuring.name}</span>
                <span className="text-slate-500">· {activeRestructuring.status_display}</span>
              </>
            ) : (
              "Selecciona reestructuración"
            )}
            <ChevronDown size={12} />
          </button>
          {openRestr && (
            <div className="absolute left-0 top-full z-40 mt-1 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
              <div className="max-h-80 overflow-y-auto p-1">
                {restrs.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">
                    Esta entidad aún no tiene reestructuraciones. Crea la primera.
                  </p>
                ) : (
                  restrs.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectRestr(r)}
                      className={
                        "block w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-50 " +
                        (activeRestructuring?.id === r.id
                          ? "bg-brand-50 text-brand-900"
                          : "text-slate-700")
                      }
                    >
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {r.reference_date} · {r.status_display}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 p-1">
                <button
                  onClick={() => {
                    setOpenRestr(false);
                    setShowNewRestr(true);
                  }}
                  className="flex w-full items-center gap-1 rounded px-3 py-2 text-left text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  <Plus size={12} /> Crear nueva reestructuración
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => {
            setOpenUser(!openUser);
            setOpenEntity(false);
            setOpenRestr(false);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <User size={14} />
          <span className="font-semibold text-slate-900">{user.username}</span>
          <ChevronDown size={12} />
        </button>
        {openUser && (
          <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
            <div className="px-3 py-2 text-[11px] text-slate-500">
              {user.first_name} {user.last_name}
              {user.groups.length > 0 && (
                <div className="text-slate-400">{user.groups.join(", ")}</div>
              )}
            </div>
            <button
              onClick={doLogout}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50"
            >
              <LogOut size={12} /> Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {showNewRestr && activeEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Nueva reestructuración</h3>
            <p className="mt-1 text-xs text-slate-500">
              Entidad: <strong>{activeEntity.name}</strong>
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Nombre *</label>
                <input
                  value={newRestr.name}
                  onChange={(e) => setNewRestr({ ...newRestr, name: e.target.value })}
                  placeholder="Rediseño institucional 2026"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Fecha de referencia *
                </label>
                <input
                  type="date"
                  value={newRestr.reference_date}
                  onChange={(e) =>
                    setNewRestr({ ...newRestr, reference_date: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Descripción</label>
                <textarea
                  value={newRestr.description}
                  onChange={(e) => setNewRestr({ ...newRestr, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={createRestr}
                disabled={!newRestr.name}
                className="flex-1 rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:bg-slate-300"
              >
                Crear
              </button>
              <button
                onClick={() => setShowNewRestr(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
