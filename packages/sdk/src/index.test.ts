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
    { key: "dark-mode", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: [] },
    { key: "new-ui", parentKey: null, enabled: false, inheritParent: false, allowList: [], denyList: [] },
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
          { key: "dark-mode", parentKey: null, enabled: false, inheritParent: false, allowList: [], denyList: [] },
          { key: "new-ui", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: [] },
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

  describe("evaluation precedence", () => {
    const makeSnapshot = (flags: Snapshot["flags"]): Snapshot => ({
      version: 1,
      projectKey: "p",
      envKey: "e",
      flags,
    });

    function stubFetch(snapshot: Snapshot) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => snapshot,
      }));
    }

    it("denyList blocks a subject even when the flag is enabled", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: ["blocked-user"] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator({ subjectKey: "blocked-user" });
      expect(evaluator.isEnabled("feat")).toBe(false);
    });

    it("denyList does not affect other subjects", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: ["blocked-user"] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator({ subjectKey: "other-user" });
      expect(evaluator.isEnabled("feat")).toBe(true);
    });

    it("allowList can enable access for listed subjects even when the flag is disabled", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: false, inheritParent: false, allowList: ["vip-user"], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const allowedEval = await cache.evaluator({ subjectKey: "vip-user" });
      expect(allowedEval.isEnabled("feat")).toBe(true);
      const blockedEval = await cache.evaluator({ subjectKey: "regular-user" });
      expect(blockedEval.isEnabled("feat")).toBe(false);
    });

    it("empty allowList falls through to base enabled state", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator({ subjectKey: "any-user" });
      expect(evaluator.isEnabled("feat")).toBe(true);
    });

    it("denyList takes precedence over allowList", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: true, inheritParent: false, allowList: ["user-x"], denyList: ["user-x"] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator({ subjectKey: "user-x" });
      expect(evaluator.isEnabled("feat")).toBe(false);
    });

    it("inheritParent delegates to parent flag when no subject targeting applies", async () => {
      stubFetch(makeSnapshot([
        { key: "parent", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: [] },
        { key: "child", parentKey: "parent", enabled: false, inheritParent: true, allowList: [], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator();
      // child inherits parent (enabled=true), overriding its own enabled=false
      expect(evaluator.isEnabled("child")).toBe(true);
    });

    it("cycle detection returns base enabled state and does not throw", async () => {
      stubFetch(makeSnapshot([
        { key: "a", parentKey: "b", enabled: true, inheritParent: true, allowList: [], denyList: [] },
        { key: "b", parentKey: "a", enabled: false, inheritParent: true, allowList: [], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator();
      // Should not throw and should resolve to base enabled state (true for "a")
      expect(evaluator.isEnabled("a")).toBe(true);
    });

    it("non-empty allowList blocks access when no subjectKey is provided", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: true, inheritParent: false, allowList: ["vip"], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator(); // no subjectKey
      // Strict whitelist: no subject cannot be in the list, so access is denied.
      expect(evaluator.isEnabled("feat")).toBe(false);
    });

    it("non-empty allowList blocks an unlisted subject even when the flag is enabled", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: true, inheritParent: false, allowList: ["vip"], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator({ subjectKey: "other" });
      // Strict whitelist: "other" is not in allowList, so access is denied even though enabled=true.
      expect(evaluator.isEnabled("feat")).toBe(false);
    });

    it("no subjectKey with empty allowList uses base enabled state", async () => {
      stubFetch(makeSnapshot([
        { key: "feat", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator(); // no subjectKey
      expect(evaluator.isEnabled("feat")).toBe(true);
    });

    it("child allowList takes precedence over parent inheritance", async () => {
      stubFetch(makeSnapshot([
        { key: "parent", parentKey: null, enabled: false, inheritParent: false, allowList: [], denyList: [] },
        { key: "child", parentKey: "parent", enabled: false, inheritParent: true, allowList: ["vip"], denyList: [] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      // vip subject: child's allowList grants explicit access (overrides parent's enabled=false)
      const vipEval = await cache.evaluator({ subjectKey: "vip" });
      expect(vipEval.isEnabled("child")).toBe(true);
      // non-vip subject: not in allowList, strict whitelist blocks access
      const otherEval = await cache.evaluator({ subjectKey: "other" });
      expect(otherEval.isEnabled("child")).toBe(false);
    });

    it("child denyList takes precedence over parent inheritance", async () => {
      stubFetch(makeSnapshot([
        { key: "parent", parentKey: null, enabled: true, inheritParent: false, allowList: [], denyList: [] },
        { key: "child", parentKey: "parent", enabled: true, inheritParent: true, allowList: [], denyList: ["blocked"] },
      ]));
      const cache = PlumaSnapshotCache.create({ baseUrl: BASE_URL, token: TOKEN });
      const evaluator = await cache.evaluator({ subjectKey: "blocked" });
      // blocked is in child's denyList, so access is denied even though parent is enabled
      expect(evaluator.isEnabled("child")).toBe(false);
    });
  });
});

