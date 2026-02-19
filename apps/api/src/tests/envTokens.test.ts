import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import {
  PROJECT_ID, ENV_ID, TOKEN_ID, AUTH_COOKIE,
  mockSession, mockEnvironment, mockSdkToken,
} from './fixtures';

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
      updateMany: vi.fn(),
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

describe('Env-scoped SDK Token routes', () => {
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

  describe('GET /api/v1/environments/:envId/sdk-tokens', () => {
    it('should list active tokens for an environment', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.sdkToken.findMany.mockResolvedValue([mockSdkToken]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/sdk-tokens`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('name', mockSdkToken.name);
      expect(payload[0]).not.toHaveProperty('token');
      // Listing must never return the plaintext token
      expect(prismaMock.sdkToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ envId: ENV_ID, revokedAt: null }) }),
      );
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/sdk-tokens`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 without session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/environments/${ENV_ID}/sdk-tokens`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/environments/:envId/sdk-tokens', () => {
    it('should create a token and return the plaintext once', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.sdkToken.create.mockResolvedValue(mockSdkToken);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/environments/${ENV_ID}/sdk-tokens`,
        payload: { name: 'CI Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('token');
      expect(payload.token).toMatch(/^pluma_sdk_/);
      // Verify only the hash was stored, not the raw token
      const storedHash = prismaMock.sdkToken.create.mock.calls[0][0].data.tokenHash;
      const expectedHash = createHash('sha256').update(payload.token).digest('hex');
      expect(storedHash).toBe(expectedHash);
    });

    it('should set envId and projectId on the created token', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.sdkToken.create.mockResolvedValue(mockSdkToken);

      await app.inject({
        method: 'POST',
        url: `/api/v1/environments/${ENV_ID}/sdk-tokens`,
        payload: { name: 'CI Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(prismaMock.sdkToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            envId: ENV_ID,
            projectId: PROJECT_ID,
          }),
        }),
      );
    });

    it('should return 400 for invalid payload', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/environments/${ENV_ID}/sdk-tokens`,
        payload: {},
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/environments/${ENV_ID}/sdk-tokens`,
        payload: { name: 'CI Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/sdk-tokens/:id', () => {
    it('should revoke a token immediately', async () => {
      prismaMock.sdkToken.update.mockResolvedValue({ ...mockSdkToken, revokedAt: new Date() });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/sdk-tokens/${TOKEN_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(204);
      expect(prismaMock.sdkToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: TOKEN_ID, revokedAt: null }),
        }),
      );
    });

    it('should return 404 when token not found or already revoked', async () => {
      prismaMock.sdkToken.update.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/sdk-tokens/${TOKEN_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 without session', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/sdk-tokens/${TOKEN_ID}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
