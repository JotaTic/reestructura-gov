import { getContextHeaders, useContextStore } from "@/stores/contextStore";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Query = Record<string, string | number | undefined | null>;

function qs(params?: Query) {
  if (!params) return "";
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? "?" + parts.join("&") : "";
}

/**
 * Obtiene cookie de csrftoken para POST/PUT/PATCH/DELETE.
 * Django DRF con SessionAuthentication exige CSRF en modificaciones.
 */
function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

function baseHeaders(method: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getContextHeaders(),
  };
  if (method !== "GET" && method !== "HEAD") {
    const token = csrfToken();
    if (token) headers["X-CSRFToken"] = token;
  }
  return headers;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Sesión caducada. Limpiamos y redirigimos a login (si estamos en cliente).
    useContextStore.getState().clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Sesión caducada", "unauthenticated");
  }
  if (res.status === 403) {
    // Puede ser contexto faltante (entity/restructuring) o permiso real.
    let payload: { detail?: string; code?: string } = {};
    try {
      payload = await res.json();
    } catch {
      /* noop */
    }
    throw new ApiError(403, payload.detail ?? "Prohibido", payload.code ?? "forbidden");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${res.statusText}: ${text}`, "http_error");
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.blob()) as unknown as T;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Query
): Promise<T> {
  return fetch(`${API_URL}${path}${qs(params)}`, {
    method,
    credentials: "include",
    headers: baseHeaders(method),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).then(handle<T>);
}

function requestForm<T>(method: string, path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = { ...getContextHeaders() };
  if (method !== "GET" && method !== "HEAD") {
    const token = csrfToken();
    if (token) headers["X-CSRFToken"] = token;
  }
  // No Content-Type — el browser lo setea automáticamente con boundary para multipart
  return fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: formData,
    cache: "no-store",
  }).then(handle<T>);
}

export const api = {
  get: <T>(path: string, params?: Query) => request<T>("GET", path, undefined, params),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postForm: <T>(path: string, formData: FormData) => requestForm<T>("POST", path, formData),
  downloadUrl: (path: string) => `${API_URL}${path}`,
};
