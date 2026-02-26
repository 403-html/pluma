import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  OTHER_PROJECT_ID, ENV_ID, FLAG_ID, AUTH_COOKIE,
  mockSession, mockEnvironment, mockFlag, mockFlagConfig,
} from './fixtures';

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
      count: vi.fn(),
      create: vi.fn(),
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
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    environment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    flagConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn() as any,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) => fn(prismaMock));
  return { prismaMock };
});

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));

describe('Flag Config routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
  });

  describe('GET /api/v1/environments/:envId/flags', () => {
    it('should return flags with enabled state for environment', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);
      prismaMock.flagConfig.findMany.mockResolvedValue([mockFlagConfig]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('nextCursor', null);
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0]).toHaveProperty('flagId', FLAG_ID);
      expect(payload.data[0]).toHaveProperty('key', mockFlag.key);
      expect(payload.data[0]).toHaveProperty('enabled', true);
    });

    it('should default enabled to false when no config exists', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);
      prismaMock.flagConfig.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data[0]).toHaveProperty('enabled', false);
    });

    it('should include allowList and denyList from the config row', async () => {
      const configWithLists = { ...mockFlagConfig, allowList: ['user-a', 'user-b'], denyList: ['user-c'] };
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);
      prismaMock.flagConfig.findMany.mockResolvedValue([configWithLists]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data[0]).toHaveProperty('allowList', ['user-a', 'user-b']);
      expect(payload.data[0]).toHaveProperty('denyList', ['user-c']);
    });

    it('should default allowList and denyList to [] when no config exists', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);
      prismaMock.flagConfig.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data[0]).toHaveProperty('allowList', []);
      expect(payload.data[0]).toHaveProperty('denyList', []);
    });

    it('should return nextCursor when there are more flags than PAGE_SIZE', async () => {
      // Simulate PAGE_SIZE + 1 flags returned (triggers hasNextPage)
      const CURSOR_ID = 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee';
      const extraFlag = { ...mockFlag, id: CURSOR_ID, key: 'extra-flag' };
      const manyFlags = Array.from({ length: 101 }, (_, i) =>
        i === 100 ? extraFlag : { ...mockFlag, id: `${FLAG_ID.slice(0, -1)}${i % 10}`, key: `flag-${i}` },
      );
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findMany.mockResolvedValue(manyFlags);
      prismaMock.flagConfig.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.data).toHaveLength(100);
      expect(payload.nextCursor).toBe(payload.data[99].flagId);
    });

    it('should accept a cursor query param', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);
      prismaMock.flagConfig.findMany.mockResolvedValue([mockFlagConfig]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags?cursor=${FLAG_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('nextCursor', null);
    });

    it('should return 400 for an invalid cursor', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags?cursor=not-a-uuid`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/environments/:envId/flags/:flagId', () => {
    it('should enable a flag in an environment', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findUnique.mockResolvedValue(mockFlag);
      prismaMock.flagConfig.upsert.mockResolvedValue(mockFlagConfig);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('enabled', true);
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 when flag not found', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when flag belongs to a different project', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findUnique.mockResolvedValue({ ...mockFlag, projectId: OTHER_PROJECT_ID });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid payload', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: {},
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 when no session cookie', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should update allowList and denyList for a flag config', async () => {
      const updatedConfig = { ...mockFlagConfig, allowList: ['user-a', 'user-b'], denyList: ['user-c'] };
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findUnique.mockResolvedValue(mockFlag);
      prismaMock.flagConfig.upsert.mockResolvedValue(updatedConfig);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { allowList: ['user-a', 'user-b'], denyList: ['user-c'] },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('allowList', ['user-a', 'user-b']);
      expect(payload).toHaveProperty('denyList', ['user-c']);
    });

    it('should return 400 when allowList contains duplicates', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { allowList: ['user-a', 'user-a'] },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when denyList contains duplicates', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { denyList: ['user-x', 'user-x'] },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when the same subject appears in both allowList and denyList', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { allowList: ['user-a'], denyList: ['user-a'] },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when allowList contains an empty string', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { allowList: [''] },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when denyList contains an empty string', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { denyList: [''] },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept a valid rolloutPercentage', async () => {
      const updatedConfig = { ...mockFlagConfig, rolloutPercentage: 50 };
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findUnique.mockResolvedValue(mockFlag);
      prismaMock.flagConfig.upsert.mockResolvedValue(updatedConfig);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { rolloutPercentage: 50 },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('rolloutPercentage', 50);
    });

    it('should accept rolloutPercentage boundary value of 0', async () => {
      const updatedConfig = { ...mockFlagConfig, rolloutPercentage: 0 };
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findUnique.mockResolvedValue(mockFlag);
      prismaMock.flagConfig.upsert.mockResolvedValue(updatedConfig);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { rolloutPercentage: 0 },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('rolloutPercentage', 0);
    });

    it('should accept rolloutPercentage boundary value of 100', async () => {
      const updatedConfig = { ...mockFlagConfig, rolloutPercentage: 100 };
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.featureFlag.findUnique.mockResolvedValue(mockFlag);
      prismaMock.flagConfig.upsert.mockResolvedValue(updatedConfig);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { rolloutPercentage: 100 },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('rolloutPercentage', 100);
    });

    it('should return 400 when rolloutPercentage is above 100', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { rolloutPercentage: 101 },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when rolloutPercentage is below 0', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { rolloutPercentage: -1 },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when rolloutPercentage is not an integer', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { rolloutPercentage: 50.5 },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
