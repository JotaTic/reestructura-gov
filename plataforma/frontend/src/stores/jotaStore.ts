"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api";
import type { JotaAnswer, JotaConfig, JotaMessage } from "@/types";

interface JotaState {
  isOpen: boolean;
  config: JotaConfig | null;
  configLoaded: boolean;
  history: JotaMessage[];
  loading: boolean;

  loadConfig: () => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  send: (question: string) => Promise<void>;
  clear: () => void;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useJotaStore = create<JotaState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      config: null,
      configLoaded: false,
      history: [],
      loading: false,

      loadConfig: async () => {
        if (get().configLoaded) return;
        try {
          const config = await api.get<JotaConfig>("/jota/config/");
          set({ config, configLoaded: true });
        } catch {
          set({ configLoaded: true });
        }
      },

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      send: async (question: string) => {
        const text = question.trim();
        if (!text) return;
        const userMsg: JotaMessage = {
          id: makeId(),
          role: "user",
          text,
          timestamp: Date.now(),
        };
        set((s) => ({ history: [...s.history, userMsg], loading: true }));
        try {
          const res = await api.post<JotaAnswer>("/jota/ask/", { question: text });
          const botMsg: JotaMessage = {
            id: makeId(),
            role: "bot",
            text: res.answer,
            timestamp: Date.now(),
            matchedIntent: res.matched_intent,
          };
          set((s) => ({ history: [...s.history, botMsg], loading: false }));
        } catch {
          const botMsg: JotaMessage = {
            id: makeId(),
            role: "bot",
            text: "No pude procesar la pregunta en este momento. Intenta de nuevo.",
            timestamp: Date.now(),
          };
          set((s) => ({ history: [...s.history, botMsg], loading: false }));
        }
      },

      clear: () => set({ history: [] }),
    }),
    {
      name: "reestructura-jota",
      // sessionStorage: historial solo dura la sesión del navegador.
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.sessionStorage : (undefined as unknown as Storage)
      ),
      partialize: (state) => ({
        history: state.history,
        isOpen: state.isOpen,
      }),
    }
  )
);
