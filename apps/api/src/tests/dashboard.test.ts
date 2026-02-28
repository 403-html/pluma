import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { AUTH_COOKIE, mockSession } from './fixtures';
import { MS_PER_DAY, CHART_DAYS, MAX_AUDIT_LOGS } from '../routes/admin/dashboard';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      findUnique: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    environment: {
      count: vi.fn(),
    },
    flagConfig: {
      count: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));

// Fixed "now" so date arithmetic in tests is deterministic
const FIXED_NOW = new Date('2025-06-15T12:00:00.000Z').getTime();

describe('Dashboard routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/v1/dashboard', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 200 with correct dashboard shape when authenticated', async () => {
      prismaMock.project.count.mockResolvedValue(3);
      prismaMock.environment.count.mockResolvedValue(6);
      // flagConfig.count is called 3 times (activeFlags, targetedFlags, rollingOutFlags)
      prismaMock.flagConfig.count
        .mockResolvedValueOnce(10) // activeFlags
        .mockResolvedValueOnce(2)  // targetedFlags
        .mockResolvedValueOnce(1); // rollingOutFlags
      prismaMock.auditLog.count.mockResolvedValue(5); // recentChanges
      prismaMock.auditLog.findMany.mockResolvedValue([]); // no logs in last 7 days

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.projects).toBe(3);
      expect(body.environments).toBe(6);
      expect(body.activeFlags).toBe(10);
      expect(body.targetedFlags).toBe(2);
      expect(body.rollingOutFlags).toBe(1);
      expect(body.recentChanges).toBe(5);
      expect(Array.isArray(body.dailyChanges)).toBe(true);
      expect(body.dailyChanges).toHaveLength(7);
    });

    it('should return dailyChanges with 7 ascending dates', async () => {
      prismaMock.project.count.mockResolvedValue(0);
      prismaMock.environment.count.mockResolvedValue(0);
      prismaMock.flagConfig.count.mockResolvedValue(0);
      prismaMock.auditLog.count.mockResolvedValue(0);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // 7 entries, sorted ascending
      expect(body.dailyChanges).toHaveLength(7);
      expect(body.dailyChanges[0].date).toBe('2025-06-09');
      expect(body.dailyChanges[6].date).toBe('2025-06-15');

      // All counts are 0 since findMany returned []
      for (const entry of body.dailyChanges) {
        expect(entry.count).toBe(0);
      }
    });

    it('should correctly group auditLog rows into dailyChanges counts', async () => {
      prismaMock.project.count.mockResolvedValue(0);
      prismaMock.environment.count.mockResolvedValue(0);
      prismaMock.flagConfig.count.mockResolvedValue(0);
      prismaMock.auditLog.count.mockResolvedValue(0);

      // 3 logs on 2025-06-15, 2 on 2025-06-13
      prismaMock.auditLog.findMany.mockResolvedValue([
        { createdAt: new Date('2025-06-15T08:00:00.000Z') },
        { createdAt: new Date('2025-06-15T09:00:00.000Z') },
        { createdAt: new Date('2025-06-15T10:00:00.000Z') },
        { createdAt: new Date('2025-06-13T14:00:00.000Z') },
        { createdAt: new Date('2025-06-13T15:00:00.000Z') },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      const byDate = Object.fromEntries(
        body.dailyChanges.map((e: { date: string; count: number }) => [e.date, e.count]),
      );

      expect(byDate['2025-06-15']).toBe(3);
      expect(byDate['2025-06-13']).toBe(2);
      expect(byDate['2025-06-14']).toBe(0); // missing day filled with 0
    });

    it('should query auditLog.count with a 24h window for recentChanges', async () => {
      prismaMock.project.count.mockResolvedValue(0);
      prismaMock.environment.count.mockResolvedValue(0);
      prismaMock.flagConfig.count.mockResolvedValue(0);
      prismaMock.auditLog.count.mockResolvedValue(7);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: { cookie: AUTH_COOKIE },
      });

      const expectedSince = new Date(FIXED_NOW - MS_PER_DAY);
      expect(prismaMock.auditLog.count).toHaveBeenCalledWith({
        where: { createdAt: { gte: expectedSince } },
      });
    });

    it('should query auditLog.findMany with a 7-day window for dailyChanges', async () => {
      prismaMock.project.count.mockResolvedValue(0);
      prismaMock.environment.count.mockResolvedValue(0);
      prismaMock.flagConfig.count.mockResolvedValue(0);
      prismaMock.auditLog.count.mockResolvedValue(0);
      prismaMock.auditLog.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard',
        headers: { cookie: AUTH_COOKIE },
      });

      const expectedSince = new Date(FIXED_NOW - (CHART_DAYS - 1) * MS_PER_DAY);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
        where:   { createdAt: { gte: expectedSince } },
        select:  { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take:    MAX_AUDIT_LOGS,
      });
    });
  });
});
