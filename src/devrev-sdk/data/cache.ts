// Client-side request cache with stale-while-revalidate semantics.
//
// Provides:
// - Request deduplication (concurrent identical requests share one fetch)
// - TTL-based caching with stale-while-revalidate
// - Manual invalidation by key or prefix
//
// NOT a global state manager — just prevents redundant network calls.

type FetcherFn<T> = () => Promise<T>;

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  staleAt: number;
  expiresAt: number;
}

// Active in-flight requests for deduplication
const inflight = new Map<string, Promise<unknown>>();

// Cached results
const cache = new Map<string, CacheEntry<unknown>>();

// Default TTLs
const DEFAULT_STALE_MS = 30_000;  // 30s before background revalidation
const DEFAULT_EXPIRE_MS = 300_000; // 5min hard expiry

// ─── Core: fetch with cache ────────────────────────────────────

export async function cachedFetch<T>(
  key: string,
  fetcher: FetcherFn<T>,
  opts?: { staleMs?: number; expireMs?: number }
): Promise<T> {
  const staleMs = opts?.staleMs ?? DEFAULT_STALE_MS;
  const expireMs = opts?.expireMs ?? DEFAULT_EXPIRE_MS;
  const now = Date.now();

  // 1. Check cache
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry) {
    // Still fresh — return immediately
    if (now < entry.staleAt) {
      return entry.data;
    }

    // Stale but not expired — return stale data, revalidate in background
    if (now < entry.expiresAt) {
      revalidateInBackground(key, fetcher, staleMs, expireMs);
      return entry.data;
    }

    // Expired — fall through to fetch
  }

  // 2. Deduplicate concurrent requests
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // 3. Fetch fresh data
  const promise = fetcher()
    .then((data) => {
      cache.set(key, {
        data,
        createdAt: Date.now(),
        staleAt: Date.now() + staleMs,
        expiresAt: Date.now() + expireMs,
      });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

// ─── Background revalidation ───────────────────────────────────

function revalidateInBackground<T>(
  key: string,
  fetcher: FetcherFn<T>,
  staleMs: number,
  expireMs: number
) {
  // Don't revalidate if already in-flight
  if (inflight.has(key)) return;

  const promise = fetcher()
    .then((data) => {
      cache.set(key, {
        data,
        createdAt: Date.now(),
        staleAt: Date.now() + staleMs,
        expiresAt: Date.now() + expireMs,
      });
    })
    .catch(() => {
      // Background revalidation failed — stale data remains
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
}

// ─── Cache management ──────────────────────────────────────────

/** Invalidate a specific cache key */
export function invalidate(key: string) {
  cache.delete(key);
}

/** Invalidate all keys matching a prefix */
export function invalidatePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/** Clear entire cache */
export function clearCache() {
  cache.clear();
}

/** Get cache stats (for debugging) */
export function getCacheStats() {
  return {
    entries: cache.size,
    inflight: inflight.size,
    keys: Array.from(cache.keys()),
  };
}
