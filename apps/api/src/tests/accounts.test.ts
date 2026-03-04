import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  USER_ID, AUTH_COOKIE,
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
    $transaction: vi.fn(),
  },
}));

vi.mock('@pluma-flags/db', () => ({ prisma: prismaMock }));

describe('Accounts routes', () => {
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

  // ─── GET /api/v1/accounts ────────────────────────────────────────────────────

  describe('GET /api/v1/accounts', () => {
    it('should return paginated user list for operator', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession); // operator
      const userList = [
        { id: USER_ID, email: mockUser.email, role: 'operator', disabled: false, createdAt: FIXED_DATE },
        { id: ADMIN_USER_ID, email: mockAdminUser.email, role: 'admin', disabled: false, createdAt: FIXED_DATE },
      ];
      prismaMock.user.count.mockResolvedValue(2);
      prismaMock.user.findMany.mockResolvedValue(userList);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/accounts',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('total', 2);
      expect(payload).toHaveProperty('page', 1);
      expect(payload).toHaveProperty('pageSize', 50);
      expect(Array.isArray(payload.accounts)).toBe(true);
      expect(payload.accounts).toHaveLength(2);
      expect(payload.accounts[0]).toMatchObject({ id: USER_ID, role: 'operator', disabled: false });
      expect(payload.accounts[0]).not.toHaveProperty('passwordHash');
    });

    it('should return paginated user list for admin', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockAdminSession);
      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.user.findMany.mockResolvedValue([
        { id: USER_ID, email: mockUser.email, role: 'operator', disabled: false, createdAt: FIXED_DATE },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/accounts',
        headers: { cookie: `pluma_session=admin-token` },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('accounts');
    });

    it('should accept a page query parameter', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.count.mockResolvedValue(60);
      prismaMock.user.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/accounts?page=2',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('page', 2);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });

    it('should return 400 for invalid page parameter', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/accounts?page=0',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 for user role', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockUserSession);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/accounts',
        headers: { cookie: `pluma_session=user-token` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/accounts',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── PATCH /api/v1/accounts/:id ─────────────────────────────────────────────

  describe('PATCH /api/v1/accounts/:id', () => {
    it('operator can disable a user account', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession); // operator
      prismaMock.user.findUnique.mockResolvedValue(mockRegularUser);
      prismaMock.user.update.mockResolvedValue({ ...mockRegularUser, disabled: true });
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${REGULAR_USER_ID}`,
        headers: { cookie: AUTH_COOKIE },
        payload: { disabled: true },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('disabled', true);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: REGULAR_USER_ID }, data: { disabled: true } }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'update', entityType: 'account' }) }),
      );
    });

    it('operator can promote a user to admin', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession); // operator
      prismaMock.user.findUnique.mockResolvedValue(mockRegularUser);
      prismaMock.user.update.mockResolvedValue({ ...mockRegularUser, role: 'admin' });
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${REGULAR_USER_ID}`,
        headers: { cookie: AUTH_COOKIE },
        payload: { role: 'admin' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('role', 'admin');
    });

    it('should return 400 when body is empty', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${REGULAR_USER_ID}`,
        headers: { cookie: AUTH_COOKIE },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when role is "operator" (cannot promote to operator)', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${REGULAR_USER_ID}`,
        headers: { cookie: AUTH_COOKIE },
        payload: { role: 'operator' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 when trying to change own role', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession); // operator = USER_ID
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${USER_ID}`,
        headers: { cookie: AUTH_COOKIE },
        payload: { role: 'admin' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 when trying to change an operator role', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockAdminSession); // admin actor
      prismaMock.user.findUnique.mockResolvedValue(mockUser); // target is operator

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${USER_ID}`,
        headers: { cookie: `pluma_session=admin-token` },
        payload: { role: 'user' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 when target user does not exist', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/nonexistent-id`,
        headers: { cookie: AUTH_COOKIE },
        payload: { disabled: true },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 for user role', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockUserSession);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${USER_ID}`,
        headers: { cookie: `pluma_session=user-token` },
        payload: { disabled: true },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${USER_ID}`,
        payload: { disabled: true },
      });

      expect(response.statusCode).toBe(401);
    });

    it('operator can update both disabled and role in one request', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession); // operator
      prismaMock.user.findUnique.mockResolvedValue(mockRegularUser);
      prismaMock.user.update.mockResolvedValue({ ...mockRegularUser, role: 'admin', disabled: true });
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${REGULAR_USER_ID}`,
        headers: { cookie: AUTH_COOKIE },
        payload: { role: 'admin', disabled: true },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('role', 'admin');
      expect(payload).toHaveProperty('disabled', true);
    });

    it('should return 403 when trying to disable an operator account', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession); // operator = USER_ID
      prismaMock.user.findUnique.mockResolvedValue(mockUser); // target is operator

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${USER_ID}`,
        headers: { cookie: AUTH_COOKIE },
        payload: { disabled: true },
      });

      expect(response.statusCode).toBe(403);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('error', 'Cannot disable an operator account');
    });

    it('admin cannot disable an operator account', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockAdminSession); // admin actor
      prismaMock.user.findUnique.mockResolvedValue(mockUser); // target is operator

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/accounts/${USER_ID}`,
        headers: { cookie: `pluma_session=admin-token` },
        payload: { disabled: true },
      });

      // Operator accounts cannot be disabled by anyone — protected to prevent lockout
      expect(response.statusCode).toBe(403);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('error', 'Cannot disable an operator account');
    });
  });
});
