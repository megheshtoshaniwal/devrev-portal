"use client";

// Client-side ticket data hooks with caching and request deduplication.

import { useState, useEffect, useCallback } from "react";
import { useDevRevAPI } from "../hooks/use-devrev";
import { useSession } from "../hooks/use-session";
import { cachedFetch, invalidatePrefix } from "./cache";
import type { Ticket, TimelineEntry } from "../client/types";

// ─── useTickets: cached ticket list ────────────────────────────

export function useTickets(opts?: {
  limit?: number;
  /** Server-side filter params to pass to works.list (e.g., owned_by, reported_by) */
  apiFilters?: Record<string, unknown>;
}) {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable serialization of apiFilters to prevent unnecessary refetches
  const filterKey = opts?.apiFilters
    ? JSON.stringify(opts.apiFilters)
    : "";

  const fetch = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const apiFilters = filterKey ? JSON.parse(filterKey) : {};

    try {
      const data = await cachedFetch(
        `tickets:list${filterKey ? `:${filterKey}` : ""}`,
        () =>
          apiCall<{ works: Ticket[] }>("POST", "internal/works.list", {
            type: ["ticket"],
            limit: opts?.limit || 50,
            ...apiFilters,
          }),
        { staleMs: 30_000, expireMs: 120_000 }
      );
      setTickets(data.works || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [token, apiCall, opts?.limit, filterKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refetch = useCallback(() => {
    invalidatePrefix("tickets:");
    return fetch();
  }, [fetch]);

  return { tickets, loading, error, refetch };
}

// ─── useTicket: single ticket + timeline ───────────────────────

export function useTicket(displayId: string | null) {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !displayId) return;
    setLoading(true);
    setError(null);

    // Use works.get directly instead of listing all tickets
    cachedFetch(
      `ticket:${displayId}`,
      async () => {
        // Try direct get first
        try {
          const data = await apiCall<{ work: Ticket }>(
            "GET",
            `internal/works.get`,
            { id: displayId }
          );
          return data.work;
        } catch {
          // Fallback: search in list (display_id might not work with .get)
          const list = await apiCall<{ works: Ticket[] }>(
            "POST",
            "internal/works.list",
            { type: ["ticket"], limit: 50 }
          );
          return (list.works || []).find((w) => w.display_id === displayId) || null;
        }
      },
      { staleMs: 30_000, expireMs: 120_000 }
    )
      .then((t) => {
        setTicket(t);
        if (t) {
          // Fetch timeline (not cached — always fresh for conversations)
          return apiCall<{ timeline_entries: TimelineEntry[] }>(
            "POST",
            "internal/timeline-entries.list",
            { object: t.id, limit: 50, visibility: ["external"] }
          );
        }
      })
      .then((tlData) => {
        if (tlData) setTimeline(tlData.timeline_entries || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load ticket");
      })
      .finally(() => setLoading(false));
  }, [token, displayId, apiCall]);

  // Reply function
  const reply = useCallback(
    async (body: string) => {
      if (!ticket || !token) return;
      await apiCall("POST", "internal/timeline-entries.create", {
        type: "timeline_comment",
        object: ticket.id,
        body,
        visibility: "external",
      });
      // Optimistic update
      setTimeline((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          type: "timeline_comment",
          body,
          created_by: { type: "rev_user", id: "", display_id: "", display_name: "You" },
          created_date: new Date().toISOString(),
          visibility: "external",
        },
      ]);
    },
    [ticket, token, apiCall]
  );

  return { ticket, timeline, loading, error, reply, setTimeline };
}
