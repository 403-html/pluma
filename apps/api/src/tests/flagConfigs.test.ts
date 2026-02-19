import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

const SESSION_TOKEN = 'flagconfigs-test-session-token';
const USER_ID = '55555555-5555-4555-a555-555555555555';
const PROJECT_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const OTHER_PROJECT_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const ENV_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const FLAG_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
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
  },
}));

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));

const mockEnv = { id: ENV_ID, projectId: PROJECT_ID, key: 'staging', name: 'Staging', createdAt: new Date(), updatedAt: new Date() };
const mockFlag = { id: FLAG_ID, projectId: PROJECT_ID, key: 'dark-mode', name: 'Dark Mode', description: null, createdAt: new Date() };
const mockConfig = { envId: ENV_ID, flagId: FLAG_ID, enabled: true };

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
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'session-id',
      token: SESSION_TOKEN,
      expiresAt: new Date(Date.now() + 60_000),
      userId: USER_ID,
      createdAt: new Date(),
      user: { id: USER_ID, email: 'admin@example.com', createdAt: new Date(), passwordHash: 'hash' },
    });
  });

  const authCookie = `pluma_session=${SESSION_TOKEN}`;

  describe('GET /api/v1/environments/:envId/flags', () => {
    it('should return flags with enabled state for environment', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnv);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);
      prismaMock.flagConfig.findMany.mockResolvedValue([mockConfig]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('flagId', FLAG_ID);
      expect(payload[0]).toHaveProperty('key', 'dark-mode');
      expect(payload[0]).toHaveProperty('enabled', true);
    });

    it('should default enabled to false when no config exists', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnv);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);
      prismaMock.flagConfig.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload[0]).toHaveProperty('enabled', false);
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/flags`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/environments/:envId/flags/:flagId', () => {
    it('should enable a flag in an environment', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnv);
      prismaMock.featureFlag.findUnique.mockResolvedValue(mockFlag);
      prismaMock.flagConfig.upsert.mockResolvedValue(mockConfig);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: authCookie },
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
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 when flag not found', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnv);
      prismaMock.featureFlag.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when flag belongs to a different project', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnv);
      prismaMock.featureFlag.findUnique.mockResolvedValue({ ...mockFlag, projectId: OTHER_PROJECT_ID });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid payload', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}/flags/${FLAG_ID}`,
        payload: {},
        headers: { cookie: authCookie },
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
  });
});
