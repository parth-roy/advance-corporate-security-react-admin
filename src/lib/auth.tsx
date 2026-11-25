import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const AUTH_TOKEN_KEY = "acs_admin_auth_token";

export type AdminUserRole = "super_admin" | "admin" | "operations" | "payroll";

export interface AdminAuthUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AdminAuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  apiRequest: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env["VITE_API_URL"] as string | undefined)?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }
  return "https://api.advancecorporatesecurity.com";
}

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AdminAuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    writeStoredToken(null);
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const apiRequest = useCallback(
    async <T = unknown,>(path: string, init: RequestInit = {}): Promise<T> => {
      const activeToken = token ?? readStoredToken();
      const headers = new Headers(init.headers);
      if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
      }
      if (activeToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${activeToken}`);
      }

      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers,
        credentials: "include",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        data?: T;
      };

      if (response.status === 401 || response.status === 403) {
        if (path !== "/api/admin/auth/login" && path !== "/api/admin/auth/change-password") {
          clearSession();
        }
      }

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `Request failed (${response.status})`);
      }

      return payload.data as T;
    },
    [token, clearSession],
  );

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const savedToken = readStoredToken();
      if (!savedToken) {
        if (active) setStatus("unauthenticated");
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/admin/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
          credentials: "include",
        });

        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { user?: AdminAuthUser };
        };

        if (!active) return;

        if (response.ok && payload.success && payload.data?.user) {
          setToken(savedToken);
          setUser(payload.data.user);
          setStatus("authenticated");
        } else {
          clearSession();
        }
      } catch {
        if (active) clearSession();
      }
    }

    void verifySession();
    return () => {
      active = false;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${getApiBaseUrl()}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: { token?: string; user?: AdminAuthUser };
    };

    if (!response.ok || !payload.success || !payload.data?.token || !payload.data?.user) {
      throw new Error(payload.message || "Invalid email or password.");
    }

    writeStoredToken(payload.data.token);
    setToken(payload.data.token);
    setUser(payload.data.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const activeToken = token ?? readStoredToken();
    try {
      await fetch(`${getApiBaseUrl()}/api/admin/auth/logout`, {
        method: "POST",
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        credentials: "include",
      });
    } catch {
      // Clear local session regardless of network errors
    }
    clearSession();
  }, [token, clearSession]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const data = await apiRequest<{ token?: string }>("/api/admin/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (data?.token) {
        writeStoredToken(data.token);
        setToken(data.token);
      }
    },
    [apiRequest],
  );

  return (
    <AuthContext.Provider value={{ status, user, token, login, logout, changePassword, apiRequest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
