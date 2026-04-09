"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type { Entity, Notification, Paginated, Restructuring } from "@/types";
import { Bell, Building2, ChevronDown, Layers, LogOut, Plus, Search, User } from "lucide-react";

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
  const [openNotif, setOpenNotif] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNewRestr, setShowNewRestr] = useState(false);
  const [newRestr, setNewRestr] = useState({
    name: "",
    reference_date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: string; id: number; label: string; url: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<Paginated<Entity>>("/entidades/").then((d) => setEntities(d.results)).catch(() => {});
  }, [user]);

  // Notificaciones: cargar count y auto-refresh cada 30s
  useEffect(() => {
    if (!user) return;

    const fetchUnread = () => {
      api
        .get<{ unread_count: number }>("/notificaciones/sin-leer/")
        .then((d) => setUnreadCount(d.unread_count))
        .catch(() => {});
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 30_000);
    return () => clearInterval(timer);
  }, [user]);

  const openNotifications = () => {
    setOpenNotif(!openNotif);
    setOpenEntity(false);
    setOpenRestr(false);
    setOpenUser(false);
    if (!openNotif) {
      api
        .get<Paginated<Notification>>("/notificaciones/", { page_size: 10 })
        .then((d) => setNotifications(d.results))
        .catch(() => {});
    }
  };

  const markRead = async (ids?: number[]) => {
    try {
      const resp = await api.post<{ marked: number }>(
        "/notificaciones/marcar-leidas/",
        ids ? { ids } : {}
      );
      if (resp.marked > 0) {
        setUnreadCount((prev) => Math.max(0, prev - resp.marked));
        if (ids) {
          setNotifications((prev) =>
            prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
          );
        } else {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }
      }
    } catch {
      /* noop */
    }
  };

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

  // Global search debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get<{ results: { type: string; id: number; label: string; url: string }[] }>("/buscar/", { q: searchQuery })
        .then((d) => {
          setSearchResults(d.results);
          setShowSearch(d.results.length > 0);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectEntity = (e: Entity) => {
    setActiveEntity(e);
    setOpenEntity(false);
    // Si la nueva entidad no tiene reestructuraciones cargadas,
    // redirigimos al selector de contexto para que cree una.
    api
      .get<Restructuring[]>(`/entidades/${e.id}/reestructuraciones/`)
      .then((list) => {
        setRestrs(list);
        if (list.length === 0) {
          router.push("/seleccionar-contexto");
        } else if (list.length === 1) {
          setActiveRestructuring(list[0]);
        }
      })
      .catch(() => {});
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
          disabled={entities.length <= 1}
          onClick={() => {
            setOpenEntity(!openEntity);
            setOpenRestr(false);
            setOpenUser(false);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-white"
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
          {entities.length > 1 && <ChevronDown size={12} />}
        </button>
        {openEntity && entities.length > 1 && (
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

      {/* Global search */}
      <div className="relative hidden sm:block">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            placeholder="Buscar empleados, dependencias..."
            className="w-56 rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 lg:w-72"
          />
        </div>
        {showSearch && searchResults.length > 0 && (
          <div className="absolute left-0 top-full z-40 mt-1 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="max-h-64 overflow-y-auto p-1">
              {searchResults.map((r, i) => (
                <Link
                  key={`${r.type}-${r.id}-${i}`}
                  href={r.url}
                  onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                  className="flex items-center gap-2 rounded px-3 py-2 text-xs hover:bg-slate-50"
                >
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                    r.type === "employee" ? "bg-blue-100 text-blue-700" :
                    r.type === "department" ? "bg-emerald-100 text-emerald-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {r.type === "employee" ? "Empleado" : r.type === "department" ? "Dependencia" : "Mandato"}
                  </span>
                  <span className="text-slate-800">{r.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Campana de notificaciones */}
      <div className="relative">
        <button
          onClick={openNotifications}
          className="relative inline-flex items-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
          aria-label="Notificaciones"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {openNotif && (
          <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-xs font-semibold text-slate-700">
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markRead()}
                  className="text-[10px] text-brand-700 hover:underline"
                >
                  Marcar todas leídas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">
                  No hay notificaciones.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-slate-50 px-3 py-2 ${
                      !n.read ? "bg-brand-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-slate-800">{n.message}</p>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => setOpenNotif(false)}
                            className="text-[10px] text-brand-700 hover:underline"
                          >
                            Ver detalle →
                          </Link>
                        )}
                        <p className="mt-0.5 text-[9px] text-slate-400">
                          {n.kind_display} ·{" "}
                          {new Date(n.created_at).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => markRead([n.id])}
                          className="shrink-0 rounded px-1 py-0.5 text-[9px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => {
            setOpenUser(!openUser);
            setOpenEntity(false);
            setOpenRestr(false);
            setOpenNotif(false);
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
            <Link
              href="/seleccionar-contexto"
              onClick={() => setOpenUser(false)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Layers size={12} /> Cambiar contexto
            </Link>
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
