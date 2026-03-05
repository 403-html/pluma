import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../../app';
import type { FastifyInstance } from 'fastify';
import {
  PROJECT_ID, ENV_ID, RAW_SDK_TOKEN,
  mockSdkToken, mockEnvironmentWithProject,
} from '../fixtures';
import { PlumaSnapshotCache } from '../../../../../packages/sdk/src/index';

// ── Prisma mock (hoisted) ───────────────────────────────────────────────────
const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    sdkToken: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    featureFlag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    environment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    flagConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    passwordHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn() as any,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) => fn(prismaMock));
  return { prismaMock };
});

vi.mock('@pluma-flags/db', () => ({ prisma: prismaMock }));

// ── Helpers ─────────────────────────────────────────────────────────────────
function mockValidTokenAndEnv(configVersion = 3) {
  prismaMock.sdkToken.findUnique.mockResolvedValue(mockSdkToken);
  prismaMock.environment.findUnique.mockResolvedValue({
    ...mockEnvironmentWithProject,
    configVersion,
  });
}

function mockFlags(
  flags: Array<{
    id: string;
    key: string;
    parentFlagId?: string | null;
  }>,
  configs: Array<{
    flagId: string;
    enabled: boolean;
    allowList?: string[];
    denyList?: string[];
    rolloutPercentage?: number | null;
  }>,
) {
  prismaMock.featureFlag.findMany.mockResolvedValue(
    flags.map((f) => ({
      id: f.id,
      key: f.key,
      projectId: PROJECT_ID,
      parentFlagId: f.parentFlagId ?? null,
    })),
  );
  prismaMock.flagConfig.findMany.mockResolvedValue(
    configs.map((c) => ({
      envId: ENV_ID,
      flagId: c.flagId,
      enabled: c.enabled,
      allowList: c.allowList ?? [],
      denyList: c.denyList ?? [],
      rolloutPercentage: c.rolloutPercentage ?? null,
    })),
  );
}

// ── Server lifecycle ────────────────────────────────────────────────────────
describe('SDK ↔ API integration', () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.listen({ port: 0 });
    const address = app.server.address();
    baseUrl = `http://127.0.0.1:${(address as { port: number }).port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Full snapshot round-trip ─────────────────────────────────────────
  it('should fetch a full snapshot and evaluate flags correctly', async () => {
    mockValidTokenAndEnv(3);
    mockFlags(
      [
        { id: 'flag-1', key: 'dark-mode' },
        { id: 'flag-2', key: 'new-ui' },
      ],
      [
        { flagId: 'flag-1', enabled: true },
      ],
    );

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
    });

    const evaluator = await cache.evaluator();

    expect(evaluator.isEnabled('dark-mode')).toBe(true);
    expect(evaluator.isEnabled('new-ui')).toBe(false);
    expect(evaluator.isEnabled('unknown-flag')).toBe(false);
  });

  // ── 2. ETag / 304 caching round-trip ──────────────────────────────────
  it('should use ETag caching and return 304 on second fetch', async () => {
    mockValidTokenAndEnv(3);
    mockFlags(
      [
        { id: 'flag-1', key: 'dark-mode' },
        { id: 'flag-2', key: 'new-ui' },
      ],
      [
        { flagId: 'flag-1', enabled: true },
      ],
    );

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
      ttlMs: 0, // always stale → triggers refresh on every evaluator() call
    });

    // First call → 200 with full snapshot
    const eval1 = await cache.evaluator();
    expect(eval1.isEnabled('dark-mode')).toBe(true);
    expect(prismaMock.featureFlag.findMany).toHaveBeenCalledTimes(1);

    // Second call → sends If-None-Match: "3" → gets 304 → uses cached data
    const eval2 = await cache.evaluator();
    expect(eval2.isEnabled('dark-mode')).toBe(true);
    expect(eval2.isEnabled('new-ui')).toBe(false);

    // featureFlag.findMany should still only have been called once (304 skips flag query)
    expect(prismaMock.featureFlag.findMany).toHaveBeenCalledTimes(1);
  });

  // ── 3. configVersion update triggers re-fetch with new data ────────────
  it('should re-fetch when configVersion changes', async () => {
    // First fetch: version 3 → dark-mode enabled
    mockValidTokenAndEnv(3);
    mockFlags(
      [
        { id: 'flag-1', key: 'dark-mode' },
      ],
      [
        { flagId: 'flag-1', enabled: true },
      ],
    );

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
      ttlMs: 0,
    });

    const eval1 = await cache.evaluator();
    expect(eval1.isEnabled('dark-mode')).toBe(true);

    // Bump configVersion to 4 and disable dark-mode
    vi.clearAllMocks();
    mockValidTokenAndEnv(4);
    mockFlags(
      [
        { id: 'flag-1', key: 'dark-mode' },
      ],
      [
        { flagId: 'flag-1', enabled: false },
      ],
    );

    // Second call → sends If-None-Match: "3" → version is now 4 → 200 with new data
    const eval2 = await cache.evaluator();
    expect(eval2.isEnabled('dark-mode')).toBe(false);
  });

  // ── 4. Token auth failure round-trip ──────────────────────────────────
  it('should throw on invalid token', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue(null);

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
    });

    await expect(cache.evaluator()).rejects.toThrow('Pluma snapshot fetch failed: 401');
  });

  // ── 5. Revoked token round-trip ───────────────────────────────────────
  it('should throw on revoked token', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue({
      ...mockSdkToken,
      revokedAt: new Date(),
    });

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
    });

    await expect(cache.evaluator()).rejects.toThrow('Pluma snapshot fetch failed: 401');
  });

  // ── 6. Parent flag inheritance through SDK evaluator ──────────────────
  it('should evaluate child flag using parent inheritance', async () => {
    mockValidTokenAndEnv(3);
    mockFlags(
      [
        { id: 'flag-parent', key: 'parent-flag' },
        { id: 'flag-child', key: 'child-flag', parentFlagId: 'flag-parent' },
      ],
      [
        { flagId: 'flag-parent', enabled: true },
        { flagId: 'flag-child', enabled: false },
      ],
    );

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
    });

    const evaluator = await cache.evaluator();

    // child-flag has inheritParent=true (resolved by API because parentFlagId is set),
    // so it walks up to parent-flag which is enabled
    expect(evaluator.isEnabled('child-flag')).toBe(true);
    expect(evaluator.isEnabled('parent-flag')).toBe(true);
  });

  // ── 7. Rollout percentage through SDK evaluator ───────────────────────
  it('should evaluate rollout percentage deterministically', async () => {
    mockValidTokenAndEnv(3);
    mockFlags(
      [
        { id: 'flag-1', key: 'rollout-flag' },
      ],
      [
        { flagId: 'flag-1', enabled: true, rolloutPercentage: 50 },
      ],
    );

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
    });

    const evaluator = await cache.evaluator({ subjectKey: 'user-123' });
    const result = evaluator.isEnabled('rollout-flag');

    // Result must be deterministic — same inputs always produce same output
    expect(typeof result).toBe('boolean');

    // Verify determinism: create a second evaluator with the same subjectKey
    const evaluator2 = await cache.evaluator({ subjectKey: 'user-123' });
    expect(evaluator2.isEnabled('rollout-flag')).toBe(result);
  });

  // ── 8. AllowList / DenyList through SDK evaluator ─────────────────────
  it('should evaluate allowList and denyList correctly', async () => {
    mockValidTokenAndEnv(3);
    mockFlags(
      [
        { id: 'flag-1', key: 'acl-flag' },
      ],
      [
        {
          flagId: 'flag-1',
          enabled: false,
          allowList: ['allowed-user'],
          denyList: ['denied-user'],
        },
      ],
    );

    const cache = PlumaSnapshotCache.create({
      baseUrl,
      token: RAW_SDK_TOKEN,
    });

    // allowed-user → allow list overrides disabled state → true
    const evalAllowed = await cache.evaluator({ subjectKey: 'allowed-user' });
    expect(evalAllowed.isEnabled('acl-flag')).toBe(true);

    // denied-user → deny list overrides everything → false
    const evalDenied = await cache.evaluator({ subjectKey: 'denied-user' });
    expect(evalDenied.isEnabled('acl-flag')).toBe(false);

    // other-user → falls through to base enabled state → false
    const evalOther = await cache.evaluator({ subjectKey: 'other-user' });
    expect(evalOther.isEnabled('acl-flag')).toBe(false);
  });
});
