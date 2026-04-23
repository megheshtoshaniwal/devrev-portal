"use client";

import { useMemo } from "react";
import { useSession } from "../hooks/use-session";
import { useDevRevContext } from "../hooks/devrev-provider";
import { buildAmbientContext } from "./context";

/**
 * Hook that provides ambient context for LLM calls.
 * Use `contextPrefix` to prepend to any user message sent to the LLM.
 */
export function useAIContext() {
  const { user } = useSession();
  const { brandContext } = useDevRevContext();

  const contextPrefix = useMemo(() => {
    // Detect locale from URL
    const locale = typeof window !== "undefined"
      ? window.location.pathname.split("/")[1] || "en-US"
      : "en-US";

    return buildAmbientContext({ user, brandContext, locale });
  }, [user, brandContext]);

  return { contextPrefix };
}
