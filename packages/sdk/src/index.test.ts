import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PlumaSnapshotCache } from "./index";
import type { Snapshot } from "./index";

const BASE_URL = "https://pluma.example.com";
const TOKEN = "pluma_sdk_test_token";

const mockSnapshot: Snapshot = {
  version: 5,
  projectKey: "my-project",
  envKey: "staging",
  flags: [
    { key: "dark-mode", parentKey: null, enabled: true, inheritParent: false },
    { key: "new-ui", parentKey: null, enabled: false, inheritParent: false },
  ],
};

describe("PlumaSnapshotCache", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a cache instance via create()", () => {
    const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
    expect(cache).toBeInstanceOf(PlumaSnapshotCache);
  });

  it("throws if baseUrl is missing", () => {
    expect(() => PlumaSnapshotCache.create({ baseUrl: "", token: TOKEN })).toThrow("baseUrl is required");
  });

  it("throws if token is missing", () => {
    expect(() => PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: "" })).toThrow("token is required");
  });

  it("fetches snapshot and evaluates flags", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSnapshot,
    }));

    const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
    const evaluator = await cache.evaluator();

    expect(evaluator.isEnabled("dark-mode")).toBe(true);
    expect(evaluator.isEnabled("new-ui")).toBe(false);
    expect(evaluator.isEnabled("unknown-flag")).toBe(false);
  });

  it("returns false for unknown flags", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSnapshot,
    }));

    const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
    const evaluator = await cache.evaluator();

    expect(evaluator.isEnabled("does-not-exist")).toBe(false);
  });

  it("sends Authorization header with Bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSnapshot,
    });
    vi.stubGlobal("fetch", fetchMock);

    const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
    await cache.evaluator();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/sdk/v1/snapshot`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it("uses cached snapshot within TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSnapshot,
    });
    vi.stubGlobal("fetch", fetchMock);

    const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN, ttlMs: 60_000 });
    await cache.evaluator();
    await cache.evaluator();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles 304 Not Modified by resetting TTL without re-parsing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockSnapshot })
      .mockResolvedValueOnce({ ok: true, status: 304, json: async () => { throw new Error("should not parse"); } });
    vi.stubGlobal("fetch", fetchMock);

    const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN, ttlMs: 0 });
    await cache.evaluator();
    const evaluator = await cache.evaluator();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(evaluator.isEnabled("dark-mode")).toBe(true);
  });

  it("throws on non-ok, non-304 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
    await expect(cache.evaluator()).rejects.toThrow("401");
  });

  describe("TTL expiry renewal", () => {
    it("re-fetches and returns new snapshot data after TTL expires", async () => {
      vi.useFakeTimers();

      const updatedSnapshot: Snapshot = {
        version: 6,
        projectKey: "my-project",
        envKey: "staging",
        flags: [
          { key: "dark-mode", parentKey: null, enabled: false, inheritParent: false },
          { key: "new-ui", parentKey: null, enabled: true, inheritParent: false },
        ],
      };

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockSnapshot })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => updatedSnapshot });
      vi.stubGlobal("fetch", fetchMock);

      const TTL_MS = 5_000;
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN, ttlMs: TTL_MS });

      // First fetch — snapshot v5
      const firstEvaluator = await cache.evaluator();
      expect(firstEvaluator.isEnabled("dark-mode")).toBe(true);
      expect(firstEvaluator.isEnabled("new-ui")).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Advance time past the TTL so the cache is stale
      vi.advanceTimersByTime(TTL_MS + 1);

      // Second fetch — should re-fetch and return updated snapshot v6
      const renewedEvaluator = await cache.evaluator();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(renewedEvaluator.isEnabled("dark-mode")).toBe(false);
      expect(renewedEvaluator.isEnabled("new-ui")).toBe(true);
    });

    it("does not re-fetch when called again before TTL expires", async () => {
      vi.useFakeTimers();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSnapshot,
      });
      vi.stubGlobal("fetch", fetchMock);

      const TTL_MS = 5_000;
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN, ttlMs: TTL_MS });

      await cache.evaluator();

      // Advance time to just before TTL boundary
      vi.advanceTimersByTime(TTL_MS - 1);

      await cache.evaluator();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("negative cases", () => {
    it("throws when response body is missing the flags array", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ version: 1, projectKey: "x", envKey: "y" }), // no flags
      }));

      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      await expect(cache.evaluator()).rejects.toThrow("malformed");
    });

    it("throws when response body is missing the version field", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ projectKey: "x", envKey: "y", flags: [] }), // no version
      }));

      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      await expect(cache.evaluator()).rejects.toThrow("malformed");
    });

    it("propagates a network error when fetch rejects", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      await expect(cache.evaluator()).rejects.toThrow("Network failure");
    });

    it("throws on 403 Forbidden", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      await expect(cache.evaluator()).rejects.toThrow("403");
    });

    it("throws on 500 Internal Server Error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      await expect(cache.evaluator()).rejects.toThrow("500");
    });
  });
});

