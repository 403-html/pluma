import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import {
  PROJECT_ID, TOKEN_ID, AUTH_COOKIE,
  mockSession, mockProject, mockSdkToken,
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
    auditLog: {
      create: vi.fn(),
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

describe('SDK Token routes', () => {
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

  describe('GET /api/v1/projects/:id/tokens', () => {
    it('should list active (non-revoked) tokens for a project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.sdkToken.findMany.mockResolvedValue([mockSdkToken]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/tokens`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('name', mockSdkToken.name);
      // Verify the query filters out revoked tokens
      expect(prismaMock.sdkToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ revokedAt: null }) }),
      );
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/tokens`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/projects/:id/tokens', () => {
    it('should create a token and return the raw token once', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.sdkToken.create.mockResolvedValue(mockSdkToken);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/tokens`,
        payload: { name: 'My Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('token');
      expect(payload.token).toMatch(/^pluma_sdk_/);
      // Verify the token hash was stored, not the raw token
      const storedHash = prismaMock.sdkToken.create.mock.calls[0][0].data.tokenHash;
      const expectedHash = createHash('sha256').update(payload.token).digest('hex');
      expect(storedHash).toBe(expectedHash);
    });

    it('should return 400 for invalid payload', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/tokens`,
        payload: {},
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/tokens`,
        payload: { name: 'My Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/projects/:id/tokens/:tokenId', () => {
    it('should revoke a token', async () => {
      prismaMock.sdkToken.update.mockResolvedValue({ ...mockSdkToken, revokedAt: new Date() });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${PROJECT_ID}/tokens/${TOKEN_ID}`,
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
        url: `/api/v1/projects/${PROJECT_ID}/tokens/${TOKEN_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
