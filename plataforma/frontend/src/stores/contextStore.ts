"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Entity, Restructuring, SessionUser } from "@/types";

interface ContextState {
  // Hidratación
  hydrated: boolean;
  markHydrated: () => void;

  // Sesión
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;

  // "Recordar usuario" en login
  rememberedUsername: string | null;
  setRememberedUsername: (v: string | null) => void;

  // Contexto activo
  activeEntity: Entity | null;
  activeRestructuring: Restructuring | null;
  setActiveEntity: (entity: Entity | null) => void;
  setActiveRestructuring: (r: Restructuring | null) => void;

  // Utilidades
  clearContext: () => void;
  clearSession: () => void;

  // Token interno: cambia cada vez que el contexto cambia,
  // las páginas lo usan como key/dependency para refetch.
  version: number;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),

      user: null,
      setUser: (user) => set({ user }),

      rememberedUsername: null,
      setRememberedUsername: (v) => set({ rememberedUsername: v }),

      activeEntity: null,
      activeRestructuring: null,
      setActiveEntity: (entity) =>
        set((s) => ({
          activeEntity: entity,
          // Cambiar de entidad invalida la reestructuración activa.
          activeRestructuring: null,
          version: s.version + 1,
        })),
      setActiveRestructuring: (r) =>
        set((s) => ({
          activeRestructuring: r,
          version: s.version + 1,
        })),

      clearContext: () =>
        set((s) => ({
          activeEntity: null,
          activeRestructuring: null,
          version: s.version + 1,
        })),
      clearSession: () =>
        set((s) => ({
          user: null,
          activeEntity: null,
          activeRestructuring: null,
          version: s.version + 1,
        })),

      version: 0,
    }),
    {
      name: "reestructura-context",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage)
      ),
      // Persistimos únicamente lo que queremos recordar entre sesiones.
      // Nunca la contraseña; el usuario sí, solo si activó "Recordar".
      partialize: (state) => ({
        activeEntity: state.activeEntity,
        activeRestructuring: state.activeRestructuring,
        rememberedUsername: state.rememberedUsername,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);

/**
 * Helper sincrónico para leer el contexto desde fuera de componentes
 * (por ejemplo, en el cliente fetch).
 */
export function getContextHeaders(): Record<string, string> {
  const { activeEntity, activeRestructuring } = useContextStore.getState();
  const headers: Record<string, string> = {};
  if (activeEntity) headers["X-Entity-Id"] = String(activeEntity.id);
  if (activeRestructuring) headers["X-Restructuring-Id"] = String(activeRestructuring.id);
  return headers;
}
