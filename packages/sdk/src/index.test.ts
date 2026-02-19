import { describe, expect, it, vi, beforeEach } from "vitest";
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
});

