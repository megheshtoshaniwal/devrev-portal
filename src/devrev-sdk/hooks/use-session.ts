"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import type { RevUser } from "../client/types";
import type { AuthAdapter } from "../auth/auth-adapter";

interface SessionState {
  token: string | null;
  user: RevUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionState>({
  token: null,
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export { SessionContext };

export function useSessionProvider(opts?: {
  initialToken?: string | null;
  initialUser?: RevUser | null;
  initialAuthenticated?: boolean;
  basePath?: string;
  authAdapter?: AuthAdapter;
}): SessionState {
  const [token, setToken] = useState<string | null>(opts?.initialToken ?? null);
  const [user, setUser] = useState<RevUser | null>(opts?.initialUser ?? null);
  const [loading, setLoading] = useState(!opts?.initialToken);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(opts?.initialAuthenticated ?? false);

  // Derive basePath from current URL: /[locale]/[portalSlug]
  const getBasePath = useCallback(() => {
    if (typeof window === "undefined") return "";
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : "";
  }, []);

  // Login — delegate to auth adapter if provided, otherwise redirect to login page
  const login = useCallback(async () => {
    if (opts?.authAdapter) {
      await opts.authAdapter.login();
    } else {
      window.location.href = `${getBasePath()}/login`;
    }
  }, [getBasePath, opts?.authAdapter]);

  // Logout — clear both localStorage and cookie, then delegate to adapter
  const logout = useCallback(async () => {
    sessionStorage.removeItem("devrev_session_token");
    localStorage.removeItem("devrev_session_token");
    localStorage.removeItem("devrev_authenticated");
    // Clear httpOnly cookie
    await fetch("/api/auth/cookie", { method: "DELETE" }).catch(() => {});
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    if (opts?.authAdapter) {
      await opts.authAdapter.logout();
    } else {
      window.location.href = getBasePath() || "/";
    }
  }, [getBasePath, opts?.authAdapter]);

  // Exchange Auth0 token for DevRev rev token
  const exchangeToken = useCallback(async (auth0Token: string) => {
    const res = await fetch("/api/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth0_token: auth0Token }),
    });
    if (!res.ok) throw new Error("Token exchange failed");
    const data = await res.json();
    return data.access_token as string;
  }, []);

  // Fetch user info with rev token
  const fetchUser = useCallback(async (revToken: string) => {
    const res = await fetch("/api/devrev/internal/rev-users.self.get", {
      headers: { Authorization: revToken },
    });
    if (!res.ok) throw new Error("Failed to fetch user");
    const data = await res.json();
    return data.rev_user as RevUser;
  }, []);

  // Helper: persist token to both localStorage and httpOnly cookie
  const persistToken = useCallback(async (tkn: string, authenticated: boolean) => {
    // Store in localStorage (for backward compat)
    if (authenticated) {
      localStorage.setItem("devrev_session_token", tkn);
      localStorage.setItem("devrev_authenticated", "true");
    } else {
      sessionStorage.setItem("devrev_session_token", tkn);
    }
    // Also set httpOnly cookie (for SSR support)
    await fetch("/api/auth/cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tkn, authenticated }),
    }).catch(() => {}); // Non-critical: cookie is a progressive enhancement
  }, []);

  // On mount: check for existing session, handle Auth0 callback, or create anonymous session
  useEffect(() => {
    async function init() {
      // If server already provided token+user, skip initialization
      if (opts?.initialToken && opts?.initialUser) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Check for existing stored session
      const stored = localStorage.getItem("devrev_session_token");
      const wasAuthenticated = localStorage.getItem("devrev_authenticated") === "true";
      if (stored) {
        try {
          const userData = await fetchUser(stored);
          setToken(stored);
          setUser(userData);
          setIsAuthenticated(wasAuthenticated);
          // Sync to cookie if not already there
          await persistToken(stored, wasAuthenticated);
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem("devrev_session_token");
          localStorage.removeItem("devrev_authenticated");
        }
      }

      // 2. Create anonymous session (for public portal access)
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_ref: `anon-${Date.now()}` }),
        });
        if (res.ok) {
          const data = await res.json();
          const anonToken = data.access_token;
          setToken(anonToken);
          await persistToken(anonToken, false);

          try {
            const userData = await fetchUser(anonToken);
            setUser(userData);
          } catch {
            // Anonymous user — user fetch may fail
          }
          setIsAuthenticated(false);
        }
      } catch (err) {
        setError("Failed to initialize session");
      }

      setLoading(false);
    }

    init();
  }, [exchangeToken, fetchUser, persistToken, opts?.initialToken, opts?.initialUser]);

  return { token, user, loading, error, isAuthenticated, login, logout };
}
