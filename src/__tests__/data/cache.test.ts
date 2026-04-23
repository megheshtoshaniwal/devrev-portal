import { describe, it, expect, vi, beforeEach } from "vitest";
import { cachedFetch, invalidate, invalidatePrefix, clearCache, getCacheStats } from "@/devrev-sdk/data/cache";

beforeEach(() => {
  clearCache();
});

describe("cachedFetch", () => {
  it("calls fetcher on first request", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: "hello" });
    const result = await cachedFetch("test-key", fetcher);
    expect(result).toEqual({ data: "hello" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns cached data on second request within stale window", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: "hello" });
    await cachedFetch("test-key", fetcher, { staleMs: 60000, expireMs: 120000 });
    const result = await cachedFetch("test-key", fetcher, { staleMs: 60000, expireMs: 120000 });
    expect(result).toEqual({ data: "hello" });
    expect(fetcher).toHaveBeenCalledTimes(1); // Not called again
  });

  it("deduplicates concurrent requests", async () => {
    let resolvePromise: (val: { data: string }) => void;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const p1 = cachedFetch("dedup-key", fetcher);
    const p2 = cachedFetch("dedup-key", fetcher);

    resolvePromise!({ data: "shared" });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ data: "shared" });
    expect(r2).toEqual({ data: "shared" });
    expect(fetcher).toHaveBeenCalledTimes(1); // Only one fetch
  });

  it("refetches after invalidation", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ data: "first" })
      .mockResolvedValueOnce({ data: "second" });

    await cachedFetch("inv-key", fetcher, { staleMs: 60000, expireMs: 120000 });
    invalidate("inv-key");
    const result = await cachedFetch("inv-key", fetcher, { staleMs: 60000, expireMs: 120000 });

    expect(result).toEqual({ data: "second" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidatePrefix clears matching keys", async () => {
    const fetcher1 = vi.fn().mockResolvedValue("a");
    const fetcher2 = vi.fn().mockResolvedValue("b");
    const fetcher3 = vi.fn().mockResolvedValue("c");

    await cachedFetch("tickets:list", fetcher1, { staleMs: 60000, expireMs: 120000 });
    await cachedFetch("tickets:detail", fetcher2, { staleMs: 60000, expireMs: 120000 });
    await cachedFetch("conversations:list", fetcher3, { staleMs: 60000, expireMs: 120000 });

    invalidatePrefix("tickets:");

    // tickets should refetch
    await cachedFetch("tickets:list", fetcher1, { staleMs: 60000, expireMs: 120000 });
    expect(fetcher1).toHaveBeenCalledTimes(2);

    // conversations should still be cached
    await cachedFetch("conversations:list", fetcher3, { staleMs: 60000, expireMs: 120000 });
    expect(fetcher3).toHaveBeenCalledTimes(1);
  });

  it("getCacheStats returns correct counts", async () => {
    await cachedFetch("k1", () => Promise.resolve("a"));
    await cachedFetch("k2", () => Promise.resolve("b"));

    const stats = getCacheStats();
    expect(stats.entries).toBe(2);
    expect(stats.keys).toContain("k1");
    expect(stats.keys).toContain("k2");
  });

  it("clearCache removes all entries", async () => {
    await cachedFetch("k1", () => Promise.resolve("a"));
    clearCache();
    expect(getCacheStats().entries).toBe(0);
  });
});
