import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type User = { id: number; email: string; name: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * In development, requests go to /api/... and Vite proxies them to localhost:4000.
 * In production (Vercel), VITE_API_URL is set to the backend Vercel deployment URL,
 * so all requests become https://your-api.vercel.app/api/...
 */
const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

function apiUrl(path: string): string {
  // path is always like "/api/..."
  return `${API_BASE}${path}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("user") ?? "null"); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [, setRefreshTokenState] = useState<string | null>(() => localStorage.getItem("refreshToken"));
  const [isLoading, setIsLoading] = useState(false);

  function persist(u: User, t: string, rt: string) {
    setUser(u); setToken(t); setRefreshTokenState(rt);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("token", t);
    localStorage.setItem("refreshToken", rt);
  }

  function clearSession() {
    setUser(null); setToken(null); setRefreshTokenState(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }

  const logout = useCallback(() => clearSession(), []);

  function updateUser(partial: Partial<User>) {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }

  /**
   * Authenticated fetch — prepends API_BASE, attaches Bearer token,
   * auto-refreshes on 401, clears session if refresh fails.
   */
  const authFetch = useCallback(async (
    path: string,
    init: RequestInit = {}
  ): Promise<Response> => {
    const getToken = () => localStorage.getItem("token");

    const buildHeaders = (t: string | null) => {
      const h = new Headers(init.headers);
      if (t) h.set("Authorization", `Bearer ${t}`);
      return h;
    };

    const url = apiUrl(path);
    let res = await fetch(url, { ...init, headers: buildHeaders(getToken()) });

    if (res.status === 401) {
      const rt = localStorage.getItem("refreshToken");
      let newToken: string | null = null;

      if (rt) {
        try {
          const refreshRes = await fetch(apiUrl("/api/auth/refresh"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: rt }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            newToken = data.token as string;
            setToken(newToken);
            localStorage.setItem("token", newToken);
          }
        } catch { /* fall through */ }
      }

      if (newToken) {
        res = await fetch(url, { ...init, headers: buildHeaders(newToken) });
      } else {
        clearSession();
      }
    }

    return res;
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Login failed"); }
      const data = await res.json();
      persist(data.user, data.token, data.refreshToken ?? "");
    } finally { setIsLoading(false); }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Registration failed"); }
      return await res.json();
    } finally { setIsLoading(false); }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
