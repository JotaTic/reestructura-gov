"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { useJotaStore } from "@/stores/jotaStore";
import { useContextStore } from "@/stores/contextStore";
import { LightMarkdown } from "./LightMarkdown";

export function JotaWidget() {
  const pathname = usePathname();
  const user = useContextStore((s) => s.user);
  const hydrated = useContextStore((s) => s.hydrated);

  const isOpen = useJotaStore((s) => s.isOpen);
  const config = useJotaStore((s) => s.config);
  const configLoaded = useJotaStore((s) => s.configLoaded);
  const history = useJotaStore((s) => s.history);
  const loading = useJotaStore((s) => s.loading);
  const loadConfig = useJotaStore((s) => s.loadConfig);
  const toggle = useJotaStore((s) => s.toggle);
  const close = useJotaStore((s) => s.close);
  const send = useJotaStore((s) => s.send);
  const clear = useJotaStore((s) => s.clear);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Cargar config cuando hay sesión activa.
  useEffect(() => {
    if (hydrated && user) loadConfig();
  }, [hydrated, user, loadConfig]);

  // Autoscroll al final cuando llegan mensajes o se abre el panel.
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, history.length, loading]);

  // Cerrar con Esc.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // Reglas de visibilidad: no mostrar en login, sin usuario, sin config cargada o si está deshabilitado.
  if (!user) return null;
  if (pathname?.startsWith("/login")) return null;
  if (!configLoaded) return null;
  if (!config || !config.is_enabled) return null;

  const positionClass =
    config.position === "bottom-left" ? "left-4 lg:left-6" : "right-4 lg:right-6";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    send(input);
    setInput("");
  };

  const onSuggested = (q: string) => {
    send(q);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? "Cerrar asistente Jota" : "Abrir asistente Jota"}
        className={
          "fixed bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 lg:bottom-6 " +
          positionClass
        }
        style={{ backgroundColor: config.primary_color || "#0e7490" }}
        title="Pregúntale a Jota"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={`Asistente ${config.bot_name}`}
          className={
            "fixed bottom-20 z-40 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl lg:bottom-24 " +
            positionClass
          }
          style={{ maxHeight: "min(70vh, 560px)" }}
        >
          <header
            className="flex items-center gap-2 px-4 py-3 text-white"
            style={{ backgroundColor: config.primary_color || "#0e7490" }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">{config.bot_name}</div>
              <div className="text-[11px] opacity-80">Asistente de ayuda</div>
            </div>
            <button
              onClick={clear}
              title="Reiniciar conversación"
              className="rounded p-1 hover:bg-white/20"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={close}
              title="Cerrar"
              className="rounded p-1 hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </header>

          <div
            className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3"
            aria-live="polite"
          >
            {history.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm">
                  <LightMarkdown text={config.welcome_message} onNavigate={close} />
                </div>
                {config.suggested_questions.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                      Preguntas sugeridas
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {config.suggested_questions.map((q) => (
                        <button
                          key={q}
                          onClick={() => onSuggested(q)}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-left text-xs text-slate-700 hover:border-brand-500 hover:bg-brand-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {history.map((m) => (
                <div
                  key={m.id}
                  className={
                    "flex " + (m.role === "user" ? "justify-end" : "justify-start")
                  }
                >
                  <div
                    className={
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm " +
                      (m.role === "user"
                        ? "bg-brand-700 text-white"
                        : "bg-white text-slate-800")
                    }
                  >
                    {m.role === "bot" ? (
                      <LightMarkdown text={m.text} onNavigate={close} />
                    ) : (
                      <p>{m.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                    Jota está pensando…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              disabled={loading}
              maxLength={500}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:bg-slate-300"
            >
              <Send size={14} /> Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
