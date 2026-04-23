// Server-side data fetchers — used by Server Components and API routes.
//
// These call DevRev's API directly (no proxy) using PAT or rev user tokens.
// Results use Next.js fetch cache (revalidate) for ISR.

import type {
  Article,
  DirectoryNode,
  Directory,
  Ticket,
  Conversation,
} from "../client/types";
import type { ArticleContent } from "../articles/fetch-content";

const API_BASE = process.env.DEVREV_API_BASE || "https://api.dev.devrev-eng.ai";

// ─── Generic fetcher ───────────────────────────────────────────

async function devrevFetch<T>(
  method: "GET" | "POST",
  endpoint: string,
  token: string,
  body?: Record<string, unknown>,
  revalidate?: number
): Promise<T> {
  const url =
    method === "GET" && body
      ? `${API_BASE}/${endpoint}?${new URLSearchParams(
          Object.entries(body).reduce(
            (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
            {} as Record<string, string>
          )
        )}`
      : `${API_BASE}/${endpoint}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(body || {}) : undefined,
    next: revalidate !== undefined ? { revalidate } : undefined,
  });

  if (!res.ok) {
    throw new Error(`DevRev API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ─── Articles ──────────────────────────────────────────────────

/** Fetch a single article by display_id. Cached for 1 hour (ISR). */
export async function getArticle(
  token: string,
  displayId: string
): Promise<Article | null> {
  try {
    const res = await devrevFetch<{ article: Article }>(
      "GET",
      "internal/articles.get",
      token,
      { id: displayId },
      3600 // 1hr ISR
    );
    return res.article ?? null;
  } catch {
    return null;
  }
}

/** List articles, optionally filtered by parent directory. Cached 5 min. */
export async function listArticles(
  token: string,
  opts?: { parent?: string; limit?: number }
): Promise<{ articles: Article[]; nextCursor?: string }> {
  const res = await devrevFetch<{
    articles: Article[];
    next_cursor?: string;
  }>(
    "POST",
    "internal/articles.list",
    token,
    {
      ...(opts?.parent && { parent: [opts.parent] }),
      limit: opts?.limit || 25,
    },
    300 // 5min ISR
  );
  return { articles: res.articles || [], nextCursor: res.next_cursor };
}

/** Fetch article content from its artifact. Cached 1 hour. */
export async function getArticleContent(
  token: string,
  artifactId: string
): Promise<string | null> {
  try {
    // Step 1: locate artifact
    const locateRes = await devrevFetch<{ url?: string; artifact_url?: string }>(
      "GET",
      "internal/artifacts.locate",
      token,
      { id: artifactId, preview: "true" },
      3600
    );

    const artifactUrl = locateRes.url || locateRes.artifact_url;
    if (!artifactUrl) return null;

    // Step 2: fetch content from S3
    const contentRes = await fetch(artifactUrl, {
      next: { revalidate: 3600 },
    });
    if (!contentRes.ok) return null;

    return contentRes.text();
  } catch {
    return null;
  }
}

// ─── Directories ───────────────────────────────────────────────

/** Fetch the full directory tree. Cached 5 min. */
export async function getDirectoryTree(
  token: string
): Promise<DirectoryNode[]> {
  try {
    const res = await devrevFetch<{ directories: DirectoryNode[] }>(
      "POST",
      "internal/directories.tree",
      token,
      {},
      300
    );
    return res.directories || [];
  } catch {
    return [];
  }
}

/** Fetch a single directory by ID. Cached 5 min. */
export async function getDirectory(
  token: string,
  id: string
): Promise<Directory | null> {
  try {
    const res = await devrevFetch<{ directory: Directory }>(
      "GET",
      "internal/directories.get",
      token,
      { id },
      300
    );
    return res.directory ?? null;
  } catch {
    return null;
  }
}

// ─── Tickets (server-side, for Server Components if needed) ────

/** Fetch a single ticket by display_id. No ISR cache (user-specific). */
export async function getTicket(
  token: string,
  displayId: string
): Promise<Ticket | null> {
  try {
    const res = await devrevFetch<{ work: Ticket }>(
      "GET",
      "internal/works.get",
      token,
      { id: displayId }
    );
    return res.work ?? null;
  } catch {
    return null;
  }
}
