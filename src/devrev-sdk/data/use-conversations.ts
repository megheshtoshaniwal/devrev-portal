"use client";

import { useState, useEffect, useCallback } from "react";
import { useDevRevAPI } from "../hooks/use-devrev";
import { useSession } from "../hooks/use-session";
import { cachedFetch, invalidatePrefix } from "./cache";
import type { Conversation } from "../client/types";

export function useConversations(opts?: { limit?: number }) {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await cachedFetch(
        `conversations:list`,
        () =>
          apiCall<{ conversations: Conversation[] }>(
            "POST",
            "internal/conversations.list",
            { limit: opts?.limit || 25 }
          ),
        { staleMs: 30_000, expireMs: 120_000 }
      );
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  }, [token, apiCall, opts?.limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refetch = useCallback(() => {
    invalidatePrefix("conversations:");
    return fetch();
  }, [fetch]);

  return { conversations, loading, error, refetch };
}
