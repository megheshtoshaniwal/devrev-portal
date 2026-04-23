"use client";

import { useState, useEffect, useCallback } from "react";
import { useDevRevAPI } from "../hooks/use-devrev";
import { useSession } from "../hooks/use-session";
import { cachedFetch, invalidatePrefix } from "./cache";
import type { DirectoryNode, Article } from "../client/types";

// ─── useDirectories: cached directory tree ─────────────────────

export function useDirectories() {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const [directories, setDirectories] = useState<DirectoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    cachedFetch(
      "directories:tree",
      () =>
        apiCall<{ directories: DirectoryNode[] }>(
          "POST",
          "internal/directories.tree",
          {}
        ),
      { staleMs: 300_000, expireMs: 600_000 } // 5min stale, 10min expire
    )
      .then((data) => setDirectories(data.directories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, apiCall]);

  return { directories, loading };
}

// ─── useDirectoryArticles: articles for a specific directory ───

export function useDirectoryArticles(dirId: string | null) {
  const { apiCall } = useDevRevAPI();
  const { token } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !dirId) return;
    setLoading(true);

    cachedFetch(
      `directory:${dirId}:articles`,
      () =>
        apiCall<{ articles: Article[] }>("POST", "internal/articles.list", {
          parent: [dirId],
          limit: 50,
        }),
      { staleMs: 300_000, expireMs: 600_000 }
    )
      .then((data) => setArticles(data.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, dirId, apiCall]);

  return { articles, loading };
}
