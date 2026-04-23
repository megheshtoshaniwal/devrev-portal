"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SessionContext, useSessionProvider } from "./use-session";
import type { AuthAdapter } from "../auth/auth-adapter";
import type { BrandContext } from "../ai/types";
import type { RevUser } from "../client/types";

// ─── DevRev Context (brand info for AI) ─────────────────────────

interface DevRevContextValue {
  brandContext: BrandContext;
}

const DevRevContext = createContext<DevRevContextValue>({
  brandContext: {},
});

export function useDevRevContext() {
  return useContext(DevRevContext);
}

export { DevRevContext };

// ─── DevRev Provider ────────────────────────────────────────────

interface DevRevProviderProps {
  children: ReactNode;
  authAdapter?: AuthAdapter;
  brandContext?: BrandContext;
  initialToken?: string | null;
  initialUser?: RevUser | null;
  initialAuthenticated?: boolean;
  basePath?: string;
}

/**
 * SDK-level provider that wraps session management + brand context.
 * The portal layer adds its own providers (PortalConfig, Journey, etc.) on top.
 */
export function DevRevProvider({
  children,
  authAdapter,
  brandContext,
  initialToken,
  initialUser,
  initialAuthenticated,
  basePath,
}: DevRevProviderProps) {
  const session = useSessionProvider({
    initialToken,
    initialUser,
    initialAuthenticated,
    basePath,
    authAdapter,
  });

  return (
    <DevRevContext.Provider value={{ brandContext: brandContext || {} }}>
      <SessionContext.Provider value={session}>
        {children}
      </SessionContext.Provider>
    </DevRevContext.Provider>
  );
}
