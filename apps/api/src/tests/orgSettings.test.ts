import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  AUTH_COOKIE,
  mockUser, mockSession, FIXED_DATE,
} from './fixtures';

const ADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';
const REGULAR_USER_ID = '33333333-3333-4333-8333-333333333333';

const mockAdminUser = { ...mockUser, id: ADMIN_USER_ID, email: 'admin@example.com', role: 'admin', disabled: false };
const mockRegularUser = { ...mockUser, id: REGULAR_USER_ID, email: 'user@example.com', role: 'user', disabled: false };

const mockAdminSession = {
  ...mockSession,
  id: 'sess-admin',
  userId: ADMIN_USER_ID,
  user: mockAdminUser,
};

const mockUserSession = {
  ...mockSession,
  id: 'sess-user',
  userId: REGULAR_USER_ID,
  user: mockRegularUser,
};

const defaultOrgSettings = {
  id: 'default',
  allowedDomains: [] as string[],
  smtpFrom: '',
  sendWelcomeEmail: false,
  updatedAt: FIXED_DATE,
};

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    session: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    project: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    sdkToken: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    featureFlag: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    environment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    flagConfig: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
    orgSettings: { findUnique: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@pluma-flags/db', () => ({ prisma: prismaMock }));

describe('OrgSettings routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /api/v1/org/settings ────────────────────────────────────────────────

  describe('GET /api/v1/org/settings', () => {
    it('returns default settings (empty allowedDomains) when no row exists', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.orgSettings.upsert.mockResolvedValue(defaultOrgSettings);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('allowedDomains');
      expect(payload.allowedDomains).toEqual([]);
      expect(payload).toHaveProperty('updatedAt');
      // Verify upsert was called with create fallback
      expect(prismaMock.orgSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'default' },
          create: { id: 'default', allowedDomains: [], smtpFrom: '', sendWelcomeEmail: false },
        }),
      );
    });

    it('returns existing settings when a row exists', async () => {
      const existingSettings = {
        ...defaultOrgSettings,
        allowedDomains: ['example.com', 'acme.org'],
      };
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.orgSettings.upsert.mockResolvedValue(existingSettings);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.allowedDomains).toEqual(['example.com', 'acme.org']);
    });

    it('returns 200 for admin role', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockAdminSession);
      prismaMock.orgSettings.upsert.mockResolvedValue(defaultOrgSettings);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/org/settings',
        headers: { cookie: 'pluma_session=admin-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 200 for user role (read-only access)', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockUserSession);
      prismaMock.orgSettings.upsert.mockResolvedValue(defaultOrgSettings);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/org/settings',
        headers: { cookie: 'pluma_session=user-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/org/settings',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── PATCH /api/v1/org/settings ─────────────────────────────────────────────

  describe('PATCH /api/v1/org/settings', () => {
    it('operator can update allowedDomains', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession); // operator
      const updatedSettings = {
        ...defaultOrgSettings,
        allowedDomains: ['example.com'],
      };
      prismaMock.orgSettings.upsert.mockResolvedValue(updatedSettings);
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { allowedDomains: ['example.com'] },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.allowedDomains).toEqual(['example.com']);
    });

    it('admin can update allowedDomains', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockAdminSession);
      const updatedSettings = {
        ...defaultOrgSettings,
        allowedDomains: ['corp.com'],
      };
      prismaMock.orgSettings.upsert.mockResolvedValue(updatedSettings);
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: 'pluma_session=admin-token' },
        payload: { allowedDomains: ['corp.com'] },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.allowedDomains).toEqual(['corp.com']);
    });

    it('writes an audit log entry with orgSettings entityType', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.orgSettings.upsert.mockResolvedValue({ ...defaultOrgSettings, allowedDomains: ['example.com'] });
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { allowedDomains: ['example.com'] },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'update',
            entityType: 'orgSettings',
            entityId: 'default',
            entityKey: 'org-settings',
          }),
        }),
      );
    });

    it('returns 403 for user role', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockUserSession);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: 'pluma_session=user-token' },
        payload: { allowedDomains: ['example.com'] },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 400 for invalid allowedDomains (non-string item)', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { allowedDomains: [123] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for empty string domain', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { allowedDomains: [''] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for domain exceeding 253 chars', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      const longDomain = 'a'.repeat(254);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { allowedDomains: [longDomain] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for more than 100 domains', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      const domains = Array.from({ length: 101 }, (_, i) => `domain${i}.com`);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { allowedDomains: domains },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when no fields are provided', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        payload: { allowedDomains: ['example.com'] },
      });

      expect(response.statusCode).toBe(401);
    });

    it('operator can clear allowedDomains with empty array', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.orgSettings.upsert.mockResolvedValue(defaultOrgSettings);
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { allowedDomains: [] },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.allowedDomains).toEqual([]);
    });

    it('operator can update smtpFrom', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.orgSettings.upsert.mockResolvedValue({ ...defaultOrgSettings, smtpFrom: 'hello@company.com' });
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { smtpFrom: 'hello@company.com' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.smtpFrom).toBe('hello@company.com');
    });

    it('operator can enable sendWelcomeEmail', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.orgSettings.upsert.mockResolvedValue({ ...defaultOrgSettings, sendWelcomeEmail: true });
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { sendWelcomeEmail: true },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.sendWelcomeEmail).toBe(true);
    });

    it('returns 400 when smtpFrom exceeds 320 chars', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      const longFrom = 'a'.repeat(321);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/org/settings',
        headers: { cookie: AUTH_COOKIE },
        payload: { smtpFrom: longFrom },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
