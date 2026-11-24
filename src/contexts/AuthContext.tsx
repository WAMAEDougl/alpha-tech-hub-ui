"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore, UNAUTHORIZED_EVENT } from "@/lib/api";

export type Role = "ADMIN" | "INVENTORY" | "CUSTOMER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** true while we're checking a stored token on first load */
  loading: boolean;
  /** staffOnly: the back-office sign-in refuses customer accounts (and never stores their token). */
  login: (email: string, password: string, opts?: { staffOnly?: boolean }) => Promise<AuthUser>;
  register: (d: { name: string; email: string; password: string; phone?: string }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => { throw new Error("AuthProvider missing"); },
  register: async () => { throw new Error("AuthProvider missing"); },
  logout: () => {},
});

type AuthResponse = { access_token: string; user: AuthUser };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // true until we know whether a stored session exists (storage only exists in the browser)
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Restore the session from a stored token. The server is the source of truth for the role.
  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    let cancelled = false;
    api<AuthUser>("/auth/me")
      .then(u => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) logout(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [logout]);

  // Token expired / revoked while using the app.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const finish = (res: AuthResponse) => {
    tokenStore.set(res.access_token, res.user.role === "CUSTOMER");
    setUser(res.user);
    return res.user;
  };

  const login = useCallback(async (email: string, password: string, opts?: { staffOnly?: boolean }) => {
    const res = await api<AuthResponse>("/auth/login", { body: { email: email.trim(), password }, auth: false });
    if (opts?.staffOnly && res.user.role === "CUSTOMER") {
      throw new Error("This account does not have access to the admin area.");
    }
    return finish(res);
  }, []);

  const register = useCallback(async (d: { name: string; email: string; password: string; phone?: string }) => {
    const res = await api<AuthResponse>("/auth/register", { body: { ...d, email: d.email.trim(), phone: d.phone?.trim() || undefined }, auth: false });
    return finish(res);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** What each role may open in the admin. The server enforces the same rules. */
export const ROLE_PATHS: Record<Exclude<Role, "CUSTOMER">, string[] | "all"> = {
  ADMIN: "all",
  INVENTORY: ["/admin", "/admin/inventory", "/admin/orders", "/admin/returns", "/admin/products"],
};

export function canAccess(role: Role | undefined, path: string) {
  if (!role || role === "CUSTOMER") return false;
  const allowed = ROLE_PATHS[role];
  if (allowed === "all") return true;
  return allowed.some(p => path === p || (p !== "/admin" && path.startsWith(p + "/")));
}
