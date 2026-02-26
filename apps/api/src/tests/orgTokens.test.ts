import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  PROJECT_ID, ENV_ID, TOKEN_ID, AUTH_COOKIE,
  mockSession, mockProject, mockEnvironment, mockSdkToken,
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

/**
 * Derived from the TOKEN_PREFIX constant ('pluma_sdk_') used in route files.
 * The first 10 chars are always 'pluma_sdk_'; the remaining 2 are arbitrary hex.
 * Update this if TOKEN_PREFIX in the route files changes.
 */
const MOCK_TOKEN_PREFIX = 'pluma_sdk_' + 'aa'; // 12 chars total (TOKEN_PREFIX_LENGTH)

/** mockSdkToken enriched with tokenPrefix and nested project for org-level responses */
const mockSdkTokenWithProject = {
  ...mockSdkToken,
  tokenPrefix: MOCK_TOKEN_PREFIX,
  project: { id: PROJECT_ID, name: 'Test Project' },
  environment: { id: ENV_ID, name: 'Production' },
};

/** mockSdkToken enriched with tokenPrefix only (for create responses) */
const mockSdkTokenWithPrefix = {
  ...mockSdkToken,
  tokenPrefix: MOCK_TOKEN_PREFIX,
};

describe('Org-level Token routes', () => {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/v1/tokens
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /api/v1/tokens', () => {
    it('should return 200 with a list of active tokens including projectName', async () => {
      prismaMock.sdkToken.findMany.mockResolvedValue([mockSdkTokenWithProject]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tokens',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toMatchObject({
        id: TOKEN_ID,
        name: mockSdkToken.name,
        tokenPrefix: MOCK_TOKEN_PREFIX,
        projectId: PROJECT_ID,
        projectName: 'Test Project',
        envId: ENV_ID,
        envName: 'Production',
      });
      // Verify only active tokens are queried with a take limit
      expect(prismaMock.sdkToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ revokedAt: null }), take: 100, include: expect.objectContaining({ environment: true }) }),
      );
    });

    it('should return 200 with empty array when no active tokens exist', async () => {
      prismaMock.sdkToken.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tokens',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toEqual([]);
    });

    it('should return 401 without auth cookie', async () => {
      prismaMock.session.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tokens',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/tokens
  // ─────────────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/tokens', () => {
    it('should return 201 with raw token starting with pluma_sdk_', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.sdkToken.create.mockResolvedValue(mockSdkTokenWithPrefix);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, name: 'My Org Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('token');
      expect(payload.token).toMatch(/^pluma_sdk_/);
    });

    it('should store tokenPrefix equal to first 12 chars of the raw token', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.sdkToken.create.mockResolvedValue(mockSdkTokenWithPrefix);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, name: 'My Org Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      const payload = JSON.parse(response.payload);
      const rawToken: string = payload.token;
      const storedPrefix = prismaMock.sdkToken.create.mock.calls[0][0].data.tokenPrefix;
      expect(storedPrefix).toBe(rawToken.slice(0, 12));
    });

    it('should store tokenHash as SHA256 of the raw token, not the raw token itself', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.sdkToken.create.mockResolvedValue(mockSdkTokenWithPrefix);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, name: 'My Org Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      const payload = JSON.parse(response.payload);
      const { createHash } = await import('crypto');
      const expectedHash = createHash('sha256').update(payload.token).digest('hex');
      const storedHash = prismaMock.sdkToken.create.mock.calls[0][0].data.tokenHash;
      expect(storedHash).toBe(expectedHash);
    });

    it('should create a token with envId when envId is provided', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.environment.findUnique.mockResolvedValue(mockEnvironment);
      prismaMock.sdkToken.create.mockResolvedValue({ ...mockSdkTokenWithPrefix, envId: ENV_ID });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, envId: ENV_ID, name: 'Env Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(201);
      expect(prismaMock.sdkToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ envId: ENV_ID, projectId: PROJECT_ID }),
        }),
      );
    });

    it('should return 400 on missing projectId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { name: 'No Project' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 on invalid projectId (not a UUID)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: 'not-a-uuid', name: 'Bad Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 on empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, name: '' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 without auth cookie', async () => {
      prismaMock.session.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, name: 'My Org Token' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, name: 'My Org Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });

    it('should return 404 when envId provided but environment not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.environment.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, envId: ENV_ID, name: 'Env Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });

    it('should return 404 when envId belongs to a different project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      // Environment exists but belongs to a different project
      prismaMock.environment.findUnique.mockResolvedValue({
        ...mockEnvironment,
        projectId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tokens',
        payload: { projectId: PROJECT_ID, envId: ENV_ID, name: 'Wrong Env Token' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /api/v1/tokens/:id
  // ─────────────────────────────────────────────────────────────────────────────
  describe('DELETE /api/v1/tokens/:id', () => {
    it('should return 204 and revoke the token', async () => {
      prismaMock.sdkToken.update.mockResolvedValue({ projectId: PROJECT_ID });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tokens/${TOKEN_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(204);
      expect(response.payload).toBe('');
      expect(prismaMock.sdkToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TOKEN_ID, revokedAt: null },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('should return 404 when token not found', async () => {
      prismaMock.sdkToken.update.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tokens/${TOKEN_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });

    it('should return 404 when token is already revoked', async () => {
      prismaMock.sdkToken.update.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tokens/${TOKEN_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });

    it('should return 401 without auth cookie', async () => {
      prismaMock.session.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tokens/${TOKEN_ID}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid token id (not a UUID)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/tokens/not-a-uuid',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
