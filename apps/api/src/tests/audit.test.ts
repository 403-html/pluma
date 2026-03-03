import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@pluma-flags/db';
import { AUTH_COOKIE, mockSession, PROJECT_ID, FLAG_ID, ENV_ID } from './fixtures';
import { writeAuditLog } from '../lib/audit';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      findUnique: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@pluma-flags/db', () => ({ prisma: prismaMock }));

describe('writeAuditLog', () => {
  it('stores meta fields in audit record', async () => {
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    await writeAuditLog(
      {
        action: 'create',
        entityType: 'project',
        entityId: 'proj-1',
        actorId: 'user-1',
        actorEmail: 'test@example.com',
        meta: {
          ip: '127.0.0.1',
          ua: 'Mozilla/5.0',
          requestId: 'req-abc',
          actorType: 'user',
        },
      },
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-abc',
        actorType: 'user',
      }),
    });
  });

  it('works without meta fields', async () => {
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    await writeAuditLog({
      action: 'delete',
      entityType: 'flag',
      entityId: 'flag-1',
      actorId: 'user-2',
      actorEmail: 'user@example.com',
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'delete',
        entityType: 'flag',
        entityId: 'flag-1',
      }),
    });
  });

  it('uses provided TransactionClient when given', async () => {
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    const txMock = { auditLog: { create: vi.fn().mockResolvedValue({}) } } as unknown as Prisma.TransactionClient;
    await writeAuditLog(
      {
        action: 'update',
        entityType: 'environment',
        entityId: 'env-1',
        actorId: 'user-1',
        actorEmail: 'test@example.com',
      },
      txMock,
    );
    expect(txMock.auditLog.create).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('stores valid structured details with after field', async () => {
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    await writeAuditLog({
      action: 'update',
      entityType: 'flag',
      entityId: 'flag-1',
      actorId: 'user-1',
      actorEmail: 'test@example.com',
      details: { after: { name: 'new-name', description: 'updated' } },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: { after: { name: 'new-name', description: 'updated' } },
      }),
    });
  });

  it('stores valid structured details with before and after fields', async () => {
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    await writeAuditLog({
      action: 'update',
      entityType: 'project',
      entityId: 'proj-1',
      actorId: 'user-1',
      actorEmail: 'test@example.com',
      details: {
        before: { name: 'old-name' },
        after: { name: 'new-name' },
      },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: { before: { name: 'old-name' }, after: { name: 'new-name' } },
      }),
    });
  });

  it('omits details key when details fail validation (empty object)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    await writeAuditLog({
      action: 'update',
      entityType: 'flag',
      entityId: 'flag-1',
      actorId: 'user-1',
      actorEmail: 'test@example.com',
      details: {} as Record<string, unknown>,
    });
    const callArg = prismaMock.auditLog.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect('details' in callArg.data).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('stores valid details with reason field only', async () => {
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    await writeAuditLog({
      action: 'delete',
      entityType: 'token',
      entityId: 'token-1',
      actorId: 'user-1',
      actorEmail: 'test@example.com',
      details: { reason: 'Token compromised' },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: { reason: 'Token compromised' },
      }),
    });
  });

  it('does not include details key when details is undefined', async () => {
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});
    await writeAuditLog({
      action: 'create',
      entityType: 'project',
      entityId: 'proj-1',
      actorId: 'user-1',
      actorEmail: 'test@example.com',
    });
    const callArg = prismaMock.auditLog.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect('details' in callArg.data).toBe(false);
  });
});

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

  describe('GET /api/v1/audit/export', () => {
    it('should return export entries', async () => {
      prismaMock.auditLog.findMany.mockResolvedValue([]);
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit/export',
        headers: { cookie: AUTH_COOKIE },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('entries');
      expect(body).toHaveProperty('count');
    });

    it('should return 401 when no session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit/export',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/audit/export?projectId=not-a-uuid',
        headers: { cookie: AUTH_COOKIE },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
