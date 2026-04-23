"use client";

import { createContext, useContext, useCallback, useRef } from "react";

/**
 * Journey context — tracks what the user has done in this session.
 * Used by ticket creation to provide context to Flash and to the agent.
 *
 * Stored in memory (session-level, not persisted). Resets on page reload.
 */

export interface JourneyEntry {
  type: "article_view" | "search" | "directory_view" | "page_view";
  timestamp: number;
  data: {
    id?: string;
    title?: string;
    query?: string;
    path?: string;
  };
}

export interface JourneyState {
  entries: JourneyEntry[];
  trackArticleView: (id: string, title: string) => void;
  trackSearch: (query: string) => void;
  trackDirectoryView: (id: string, title: string) => void;
  trackPageView: (path: string) => void;
  getArticlesViewed: () => Array<{ id: string; title: string }>;
  getSearches: () => string[];
  getSummary: () => string;
}

const JourneyContext = createContext<JourneyState>({
  entries: [],
  trackArticleView: () => {},
  trackSearch: () => {},
  trackDirectoryView: () => {},
  trackPageView: () => {},
  getArticlesViewed: () => [],
  getSearches: () => [],
  getSummary: () => "",
});

export function useJourney() {
  return useContext(JourneyContext);
}

export { JourneyContext };

export function useJourneyProvider(): JourneyState {
  const entriesRef = useRef<JourneyEntry[]>([]);

  const addEntry = useCallback((entry: Omit<JourneyEntry, "timestamp">) => {
    entriesRef.current.push({ ...entry, timestamp: Date.now() });
    // Keep last 50 entries
    if (entriesRef.current.length > 50) {
      entriesRef.current = entriesRef.current.slice(-50);
    }
  }, []);

  const trackArticleView = useCallback(
    (id: string, title: string) => {
      // Deduplicate consecutive views of the same article
      const last = entriesRef.current.at(-1);
      if (last?.type === "article_view" && last.data.id === id) return;
      addEntry({ type: "article_view", data: { id, title } });
    },
    [addEntry]
  );

  const trackSearch = useCallback(
    (query: string) => {
      addEntry({ type: "search", data: { query } });
    },
    [addEntry]
  );

  const trackDirectoryView = useCallback(
    (id: string, title: string) => {
      addEntry({ type: "directory_view", data: { id, title } });
    },
    [addEntry]
  );

  const trackPageView = useCallback(
    (path: string) => {
      addEntry({ type: "page_view", data: { path } });
    },
    [addEntry]
  );

  const getArticlesViewed = useCallback(() => {
    const seen = new Set<string>();
    return entriesRef.current
      .filter((e) => e.type === "article_view" && e.data.id)
      .filter((e) => {
        if (seen.has(e.data.id!)) return false;
        seen.add(e.data.id!);
        return true;
      })
      .map((e) => ({ id: e.data.id!, title: e.data.title! }));
  }, []);

  const getSearches = useCallback(() => {
    return entriesRef.current
      .filter((e) => e.type === "search" && e.data.query)
      .map((e) => e.data.query!);
  }, []);

  const getSummary = useCallback(() => {
    const articles = getArticlesViewed();
    const searches = getSearches();
    const parts: string[] = [];

    if (searches.length > 0) {
      parts.push(`Searched for: ${searches.slice(-3).join(", ")}`);
    }
    if (articles.length > 0) {
      parts.push(
        `Read articles: ${articles
          .slice(-5)
          .map((a) => `"${a.title}"`)
          .join(", ")}`
      );
    }
    if (parts.length === 0) {
      parts.push("No prior activity in this session.");
    }

    return parts.join("\n");
  }, [getArticlesViewed, getSearches]);

  return {
    entries: entriesRef.current,
    trackArticleView,
    trackSearch,
    trackDirectoryView,
    trackPageView,
    getArticlesViewed,
    getSearches,
    getSummary,
  };
}
