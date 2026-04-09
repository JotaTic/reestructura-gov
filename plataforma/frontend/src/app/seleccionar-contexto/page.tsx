"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type { Entity, Restructuring, SessionUser } from "@/types";
import { Building2, Layers, ChevronRight, Plus, LogOut } from "lucide-react";

interface EntityWithRestructurings extends Entity {
  restructurings: Restructuring[];
}

interface ContextResponse {
  user: SessionUser;
  entities: EntityWithRestructurings[];
  default_entity_id: number | null;
}

export default function SelectContextPage() {
  const router = useRouter();
  const user = useContextStore((s) => s.user);
  const setUser = useContextStore((s) => s.setUser);
  const setActiveEntity = useContextStore((s) => s.setActiveEntity);
  const setActiveRestructuring = useContextStore((s) => s.setActiveRestructuring);
  const clearSession = useContextStore((s) => s.clearSession);

  const [entities, setEntities] = useState<EntityWithRestructurings[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityWithRestructurings | null>(null);
  const [selectedRestructuring, setSelectedRestructuring] = useState<Restructuring | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    loadContext();
  }, [user]);

  const loadContext = async () => {
    try {
      const data = await api.get<ContextResponse>("/me/context/");
      setUser(data.user);
      setEntities(data.entities);

      // Si solo hay una entidad, seleccionarla automáticamente
      if (data.entities.length === 1) {
        setSelectedEntity(data.entities[0]);
        autoSelectRestructuring(data.entities[0]);
      } else if (data.default_entity_id) {
        const def = data.entities.find((e) => e.id === data.default_entity_id);
        if (def) {
          setSelectedEntity(def);
          autoSelectRestructuring(def);
        }
      }
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const autoSelectRestructuring = (entity: EntityWithRestructurings) => {
    if (entity.restructurings.length === 1) {
      setSelectedRestructuring(entity.restructurings[0]);
    } else if (entity.restructurings.length > 1) {
      // Seleccionar la más reciente
      setSelectedRestructuring(entity.restructurings[0]);
    }
  };

  const handleEntitySelect = (entity: EntityWithRestructurings) => {
    setSelectedEntity(entity);
    setSelectedRestructuring(null);
    autoSelectRestructuring(entity);
  };

  const handleAutoCreate = async () => {
    if (!selectedEntity) return;
    setCreating(true);
    setError(null);
    try {
      const restr = await api.post<Restructuring>("/auto-crear-reestructuracion/", {
        entity_id: selectedEntity.id,
      });
      // Agregar al listado local
      setSelectedEntity({
        ...selectedEntity,
        restructurings: [restr, ...selectedEntity.restructurings],
      });
      setSelectedRestructuring(restr);
    } catch (e: unknown) {
      setError("No se pudo crear la reestructuración.");
    } finally {
      setCreating(false);
    }
  };

  const handleContinue = () => {
    if (!selectedEntity || !selectedRestructuring) return;
    setActiveEntity(selectedEntity);
    setActiveRestructuring(selectedRestructuring);
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout/", {});
    } catch { /* ignore */ }
    clearSession();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando contexto…</p>
      </div>
    );
  }

  const hasRestructurings = selectedEntity && selectedEntity.restructurings.length > 0;
  const canContinue = selectedEntity && selectedRestructuring;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white shadow-lg">
            R
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            ReEstructura.Gov
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Bienvenido, <span className="font-medium text-slate-700">{user?.first_name || user?.username}</span>.
            Selecciona el contexto de trabajo.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Paso 1: Entidad */}
          <div className="border-b border-slate-100 p-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                1
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                Selecciona la entidad
              </h2>
            </div>

            {entities.length === 0 ? (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No tienes acceso a ninguna entidad. Contacta al administrador.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {entities.map((ent) => (
                  <button
                    key={ent.id}
                    onClick={() => handleEntitySelect(ent)}
                    className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition ${
                      selectedEntity?.id === ent.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Building2
                      size={20}
                      className={
                        selectedEntity?.id === ent.id
                          ? "mt-0.5 text-brand-600"
                          : "mt-0.5 text-slate-400"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {ent.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {ent.order_display}
                        {ent.acronym && ` · ${ent.acronym}`}
                        {` · ${ent.restructurings.length} reestructuración(es)`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paso 2: Reestructuración */}
          <div className="border-b border-slate-100 p-6">
            <div className="mb-3 flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  selectedEntity
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                Selecciona la reestructuración
              </h2>
            </div>

            {!selectedEntity ? (
              <p className="text-sm text-slate-400">
                Primero selecciona una entidad.
              </p>
            ) : !hasRestructurings ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Esta entidad no tiene reestructuraciones. Se creará una automáticamente.
                </div>
                <button
                  onClick={handleAutoCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {creating
                    ? "Creando…"
                    : `Crear "Reestructuración ${selectedEntity.name} ${new Date().getFullYear()}"`}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEntity.restructurings.map((r) => {
                  const statusColors: Record<string, string> = {
                    BORRADOR: "bg-slate-100 text-slate-700",
                    DIAGNOSTICO_COMPLETO: "bg-blue-100 text-blue-700",
                    ANALISIS_COMPLETO: "bg-cyan-100 text-cyan-700",
                    APROBADO: "bg-emerald-100 text-emerald-700",
                    ACTO_EXPEDIDO: "bg-green-100 text-green-800",
                    IMPLEMENTADO: "bg-green-200 text-green-900",
                    ARCHIVADO: "bg-slate-200 text-slate-600",
                  };
                  const color = statusColors[r.status] || "bg-slate-100 text-slate-700";
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRestructuring(r)}
                      className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition ${
                        selectedRestructuring?.id === r.id
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Layers
                        size={18}
                        className={
                          selectedRestructuring?.id === r.id
                            ? "text-brand-600"
                            : "text-slate-400"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {r.code} · {r.reference_date}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}
                      >
                        {r.status_display}
                      </span>
                    </button>
                  );
                })}
                {/* Botón crear nueva */}
                <button
                  onClick={handleAutoCreate}
                  disabled={creating}
                  className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-3 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-700"
                >
                  <Plus size={16} />
                  {creating ? "Creando…" : "Crear nueva reestructuración"}
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 pt-3">
              <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-between p-6">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40"
            >
              Continuar
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          ReEstructura.Gov · Ley 489/1998 · Cartilla Función Pública 2018
        </p>
      </div>
    </div>
  );
}
