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
 *  - Permite el render libre de /login (sin sidebar/topbar).
 *  - En cualquier otra ruta: revalida la sesión contra /api/me/context/.
 *    Si falla, redirige a /login. Si tiene éxito, inyecta el usuario en el store.
 *  - Hidrata y revalida la entidad activa persistida en localStorage.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const markHydrated = useContextStore((s) => s.markHydrated);
  const user = useContextStore((s) => s.user);
  const setUser = useContextStore((s) => s.setUser);
  const activeEntity = useContextStore((s) => s.activeEntity);
  const setActiveEntity = useContextStore((s) => s.setActiveEntity);
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);

  const isPublic = pathname?.startsWith("/login");

  // Forzar rehidratación del store persistido al montar en cliente.
  // Evita quedarnos atascados en "Cargando…" si el middleware persist
  // no dispara onRehydrateStorage (SSR + Next.js).
  useEffect(() => {
    useContextStore.persist?.rehydrate?.();
    markHydrated();
    setMounted(true);
  }, [markHydrated]);

  useEffect(() => {
    if (!mounted) return;
    if (isPublic) {
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

        // Revalidar entidad activa: debe seguir existiendo y estar permitida.
        if (activeEntity) {
          const still = data.entities.find((e) => e.id === activeEntity.id);
          if (!still) {
            setActiveEntity(null);
          } else if (JSON.stringify(still) !== JSON.stringify(activeEntity)) {
            setActiveEntity(still);
          }
        }
        // Si no hay entidad activa pero el usuario tiene default o única entidad,
        // la seleccionamos automáticamente.
        if (!activeEntity) {
          const def =
            data.entities.find((e) => e.id === data.default_entity_id) ||
            (data.entities.length === 1 ? data.entities[0] : null);
          if (def) setActiveEntity(def);
        }
      } catch (e) {
        // Cualquier fallo del chequeo de sesión (401 de SessionAuth, 403 de DRF
        // cuando no se proveen credenciales, o error de red) significa que no
        // hay sesión válida: redirigimos a /login en vez de quedarnos en
        // "Cargando…" infinito.
        if (
          e instanceof ApiError &&
          (e.status === 401 || e.status === 403)
        ) {
          router.replace("/login");
          return;
        }
        // Error inesperado (red, CORS, 5xx). También mandamos al login para no
        // dejar al usuario bloqueado en el shell.
        router.replace("/login");
        return;
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isPublic]);

  if (!mounted || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    );
  }

  if (isPublic) {
    return <>{children}</>;
  }

  if (!user) {
    // El efecto ya está redirigiendo, evitamos render intermedio.
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <JotaWidget />
    </div>
  );
}
