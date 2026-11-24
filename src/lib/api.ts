// Thin fetch wrapper for the Alpha Computers API.
// The JWT lives in sessionStorage: it is gone when the browser closes, which is what you
// want on a shared shop computer.

// Same site by default: the API lives in this project at /api. Set NEXT_PUBLIC_API_URL only to point at a different server.
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");
const BASE = API_BASE;
const TOKEN_KEY = "alpha_admin_token";

const browser = () => typeof window !== "undefined";

export const tokenStore = {
  // staff sessions end when the browser closes (shared shop computers); customers stay signed in on their own device
  get: () => (browser() ? sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY) : null),
  set: (t: string, remember = false) => {
    if (!browser()) return;
    sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t);
  },
  clear: () => { if (browser()) { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } },
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Fired when the API says our token is no longer valid, so the app can sign the user out. */
export const UNAUTHORIZED_EVENT = "alpha:unauthorized";

function friendlyMessage(status: number, body: { message?: string | string[] } | null): string {
  const raw = body?.message;
  const msg = Array.isArray(raw) ? raw.join(", ") : raw;
  if (msg) return String(msg);
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status >= 500) return "The server had a problem. Please try again shortly.";
  return "Something went wrong.";
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }

  let body: { message?: string | string[] } | null = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = null; }
  }

  if (!res.ok) {
    if (res.status === 401 && token && opts.auth !== false) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(friendlyMessage(res.status, body), res.status);
  }
  return body as T;
}

export const money = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
