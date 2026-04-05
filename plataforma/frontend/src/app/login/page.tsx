"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, API_URL } from "@/lib/api";
import { useContextStore } from "@/stores/contextStore";
import type { SessionUser } from "@/types";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useContextStore((s) => s.hydrated);
  const setUser = useContextStore((s) => s.setUser);
  const remembered = useContextStore((s) => s.rememberedUsername);
  const setRemembered = useContextStore((s) => s.setRememberedUsername);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && remembered) {
      setUsername(remembered);
      setRemember(true);
    }
  }, [hydrated, remembered]);

  // Django requiere un csrftoken antes de poder aceptar el login.
  // Pedimos cualquier endpoint GET público para que el servidor emita la cookie.
  useEffect(() => {
    fetch(`${API_URL}/auth/login/`, { credentials: "include" }).catch(() => {});
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ user: SessionUser }>("/auth/login/", {
        username: username.trim(),
        password,
      });
      setUser(data.user);
      setRemembered(remember ? username.trim() : null);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Credenciales inválidas.");
      } else {
        setError("No fue posible iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 font-bold text-white">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">ReEstructura.Gov</h1>
            <p className="text-[11px] text-slate-500">Iniciar sesión</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Recordar usuario
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:bg-slate-400"
          >
            <LogIn size={14} />
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          ReEstructura.Gov · MVP · Ley 489/1998 · Cartilla FP 2018
        </p>
      </div>
    </div>
  );
}
