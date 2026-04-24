// DevRev API client — all portal API calls go through here.
// Uses /internal/* endpoints with rev user session tokens.

import type {
  RevUser,
  DevOrgPublicInfo,
  DirectoryNode,
  Directory,
  Article,
  Ticket,
  Conversation,
  TimelineEntry,
  SearchResult,
} from "./types";

const API_BASE = process.env.DEVREV_API_BASE || "https://api.devrev.ai";

interface RequestOptions {
  token: string;
  locale?: string;
  signal?: AbortSignal;
}

async function apiCall<T>(
  method: "GET" | "POST",
  endpoint: string,
  opts: RequestOptions,
  body?: Record<string, unknown>
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: opts.token.startsWith("Bearer ")
      ? opts.token
      : opts.token, // Rev tokens don't use "Bearer " prefix
    "Content-Type": "application/json",
    "Accept-Language": opts.locale || "en-US",
    "X-DevRev-Client-ID": "ai.devrev.portal-next",
    "X-DevRev-Client-Platform": "portal-next",
  };

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
    headers,
    body: method === "POST" ? JSON.stringify(body || {}) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ─── Session Token ──────────────────────────────────────────────
export async function createSessionToken(
  aat: string,
  userRef: string,
  userTraits?: {
    email?: string;
    display_name?: string;
  }
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(`${API_BASE}/auth-tokens.create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rev_info: {
        user_ref: userRef,
        ...(userTraits && { user_traits: userTraits }),
      },
    }),
  });
  if (!res.ok) throw new Error(`Session token creation failed: ${res.status}`);
  return res.json();
}

// ─── Rev User ───────────────────────────────────────────────────
export async function getRevUserSelf(opts: RequestOptions) {
  return apiCall<{ rev_user: RevUser }>("GET", "internal/rev-users.self.get", opts);
}

// ─── Portal Info ────────────────────────────────────────────────
export async function getDevOrgPublicInfo(opts: RequestOptions, slug: string) {
  return apiCall<DevOrgPublicInfo>(
    "GET",
    "internal/dev-orgs.public-info.get",
    opts,
    { slug }
  );
}

// ─── Directories ────────────────────────────────────────────────
export async function getDirectoriesTree(opts: RequestOptions) {
  return apiCall<{ directories: DirectoryNode[] }>(
    "POST",
    "internal/directories.tree",
    opts,
    {}
  );
}

export async function getDirectory(opts: RequestOptions, id: string) {
  return apiCall<{ directory: Directory }>(
    "GET",
    "internal/directories.get",
    opts,
    { id }
  );
}

// ─── Articles ───────────────────────────────────────────────────
export async function listArticles(
  opts: RequestOptions,
  params: {
    parent?: string;
    limit?: number;
    cursor?: string;
  }
) {
  return apiCall<{ articles: Article[]; next_cursor?: string; total?: number }>(
    "POST",
    "internal/articles.list",
    opts,
    {
      ...(params.parent && { parent: [params.parent] }),
      limit: params.limit || 25,
      ...(params.cursor && { cursor: params.cursor }),
    }
  );
}

export async function getArticle(opts: RequestOptions, id: string) {
  return apiCall<{ article: Article }>("GET", "internal/articles.get", opts, { id });
}

// ─── Tickets (Works) ────────────────────────────────────────────
export async function listTickets(
  opts: RequestOptions,
  params: {
    limit?: number;
    cursor?: string;
    owned_by?: string[];
    reported_by?: string[];
  }
) {
  return apiCall<{ works: Ticket[]; next_cursor?: string }>(
    "POST",
    "internal/works.list",
    opts,
    {
      type: ["ticket"],
      limit: params.limit || 25,
      ...(params.cursor && { cursor: params.cursor }),
      ...(params.owned_by && { owned_by: params.owned_by }),
      ...(params.reported_by && { reported_by: params.reported_by }),
    }
  );
}

export async function getTicket(opts: RequestOptions, id: string) {
  return apiCall<{ work: Ticket }>("GET", "internal/works.get", opts, { id });
}

export async function createTicket(
  opts: RequestOptions,
  data: {
    title: string;
    body: string;
    artifacts?: string[];
  }
) {
  return apiCall<{ work: Ticket }>("POST", "internal/works.create", opts, {
    type: "ticket",
    ...data,
  });
}

// ─── Conversations ──────────────────────────────────────────────
export async function listConversations(
  opts: RequestOptions,
  params: { limit?: number; cursor?: string }
) {
  return apiCall<{ conversations: Conversation[]; next_cursor?: string }>(
    "POST",
    "internal/conversations.list",
    opts,
    { limit: params.limit || 25, ...(params.cursor && { cursor: params.cursor }) }
  );
}

export async function createConversation(
  opts: RequestOptions,
  data: { title?: string; message: string }
) {
  return apiCall<{ conversation: Conversation }>(
    "POST",
    "internal/conversations.create",
    opts,
    {
      type: "support",
      title: data.title || data.message.slice(0, 100),
      description: data.message,
    }
  );
}

// ─── Timeline Entries ───────────────────────────────────────────
export async function listTimelineEntries(
  opts: RequestOptions,
  params: { object: string; limit?: number; cursor?: string }
) {
  return apiCall<{
    timeline_entries: TimelineEntry[];
    next_cursor?: string;
  }>("POST", "internal/timeline-entries.list", opts, {
    object: params.object,
    limit: params.limit || 50,
    ...(params.cursor && { cursor: params.cursor }),
    visibility: ["external"],
  });
}

export async function createTimelineEntry(
  opts: RequestOptions,
  data: {
    object: string;
    body: string;
    type?: string;
    visibility?: string;
    artifacts?: string[];
  }
) {
  return apiCall<{ timeline_entry: TimelineEntry }>(
    "POST",
    "internal/timeline-entries.create",
    opts,
    {
      type: data.type || "timeline_comment",
      object: data.object,
      body: data.body,
      visibility: data.visibility || "external",
      ...(data.artifacts && { artifacts: data.artifacts }),
    }
  );
}

// ─── Search ─────────────────────────────────────────────────────
export async function searchCore(
  opts: RequestOptions,
  params: { query: string; namespaces?: string[]; limit?: number }
) {
  return apiCall<{ results: SearchResult[] }>(
    "POST",
    "internal/search.core",
    opts,
    {
      query: params.query,
      namespaces: params.namespaces || ["article", "ticket"],
      limit: params.limit || 10,
    }
  );
}

// ─── Artifacts ──────────────────────────────────────────────────
export async function locateArtifact(
  opts: RequestOptions,
  id: string,
  preview?: boolean
) {
  return apiCall<{ artifact_url?: string; url?: string }>(
    "GET",
    "internal/artifacts.locate",
    opts,
    { id, ...(preview && { preview: "true" }) }
  );
}
