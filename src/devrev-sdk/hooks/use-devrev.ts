"use client";

import { useState, useCallback } from "react";
import { useSession } from "./use-session";

// Generic hook for making DevRev API calls through our proxy
export function useDevRevAPI() {
  const { token } = useSession();

  const apiCall = useCallback(
    async <T>(
      method: "GET" | "POST",
      endpoint: string,
      body?: Record<string, unknown>,
      locale?: string
    ): Promise<T> => {
      if (!token) throw new Error("No session token");

      const headers: Record<string, string> = {
        Authorization: token,
        "Content-Type": "application/json",
      };
      if (locale) headers["Accept-Language"] = locale;

      const url =
        method === "GET" && body
          ? `/api/devrev/${endpoint}?${new URLSearchParams(
              Object.entries(body).reduce(
                (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
                {} as Record<string, string>
              )
            )}`
          : `/api/devrev/${endpoint}`;

      const res = await fetch(url, {
        method,
        headers,
        ...(method === "POST" && { body: JSON.stringify(body || {}) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `API error: ${res.status}`);
      }

      return res.json();
    },
    [token]
  );

  return { apiCall, token };
}

// Hook for fetching data with loading/error states
export function useDevRevQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch };
}
