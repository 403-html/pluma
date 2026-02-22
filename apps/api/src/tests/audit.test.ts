import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { AUTH_COOKIE, mockSession, PROJECT_ID, FLAG_ID, ENV_ID } from './fixtures';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      findUnique: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));

describe('Audit routes', () => {
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

  describe('GET /api/v1/audit', () => {
    it('should return paginated audit log entries', async () => {
      const mockEntries = [
        {
          id: 'audit-1',
          action: 'create',
          entityType: 'project',
          entityId: PROJECT_ID,
          entityKey: 'test-project',
          projectId: PROJECT_ID,
          projectKey: 'test-project',
          envId: null,
          envKey: null,
          flagId: null,
          flagKey: null,
          actorId: 'user-1',
          actorEmail: 'test@example.com',
          details: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      prismaMock.auditLog.count.mockResolvedValue(1);
      prismaMock.auditLog.findMany.mockResolvedValue(mockEntries);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(50);
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].action).toBe('create');
    });

    it('should filter by projectId', async () => {
      prismaMock.auditLog.count.mockResolvedValue(0);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit?projectId=${PROJECT_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.auditLog.count).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID },
      });
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter by flagId', async () => {
      prismaMock.auditLog.count.mockResolvedValue(0);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit?flagId=${FLAG_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.auditLog.count).toHaveBeenCalledWith({
        where: { flagId: FLAG_ID },
      });
    });

    it('should filter by envId', async () => {
      prismaMock.auditLog.count.mockResolvedValue(0);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/audit?envId=${ENV_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.auditLog.count).toHaveBeenCalledWith({
        where: { envId: ENV_ID },
      });
    });

    it('should handle pagination', async () => {
      prismaMock.auditLog.count.mockResolvedValue(100);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit?page=2',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 50,
        take: 50,
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit?projectId=not-a-uuid',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 when no session cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
