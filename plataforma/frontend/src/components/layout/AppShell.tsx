"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { JotaWidget } from "@/components/jota/JotaWidget";
import { api, ApiError } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type { Entity, SessionUser } from "@/types";

/**
 * Shell global:
 *  - /login, /encuesta/* → render libre (sin sidebar/topbar, sin auth).
 *  - /seleccionar-contexto → requiere auth pero sin sidebar (pantalla completa).
 *  - Resto de rutas → requiere auth + entidad + reestructuración seleccionadas.
 *    Si falta contexto, redirige a /seleccionar-contexto.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const markHydrated = useContextStore((s) => s.markHydrated);
  const user = useContextStore((s) => s.user);
  const setUser = useContextStore((s) => s.setUser);
  const activeEntity = useContextStore((s) => s.activeEntity);
  const activeRestructuring = useContextStore((s) => s.activeRestructuring);
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);

  // Rutas que no requieren autenticación
  const isFullyPublic =
    pathname?.startsWith("/login") || pathname?.startsWith("/encuesta/");

  // Ruta que requiere auth pero no sidebar ni contexto obligatorio
  const isContextSelector = pathname === "/seleccionar-contexto";

  // Forzar rehidratación del store persistido al montar en cliente.
  useEffect(() => {
    useContextStore.persist?.rehydrate?.();
    markHydrated();
    setMounted(true);
  }, [markHydrated]);

  useEffect(() => {
    if (!mounted) return;

    if (isFullyPublic) {
      setChecking(false);
      return;
    }

    (async () => {
      try {
        const data = await api.get<{
          user: SessionUser;
          entities: Entity[];
          default_entity_id: number | null;
        }>("/me/context/");
        setUser(data.user);
      } catch (e) {
        if (
          e instanceof ApiError &&
          (e.status === 401 || e.status === 403)
        ) {
          router.replace("/login");
          return;
        }
        router.replace("/login");
        return;
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isFullyPublic]);

  if (!mounted || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    );
  }

  // Rutas públicas: render directo
  if (isFullyPublic) {
    return <>{children}</>;
  }

  // Sin usuario autenticado: redirigir
  if (!user) {
    return null;
  }

  // Selector de contexto: render sin sidebar (pantalla completa)
  if (isContextSelector) {
    return <>{children}</>;
  }

  // Rutas protegidas: exigir entidad + reestructuración
  if (!activeEntity || !activeRestructuring) {
    // Redirigir al selector de contexto
    router.replace("/seleccionar-contexto");
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Redirigiendo al selector de contexto…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <JotaWidget />
    </div>
  );
}
