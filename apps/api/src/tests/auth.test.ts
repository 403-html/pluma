import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  USER_ID, SESSION_TOKEN, AUTH_COOKIE, FIXED_DATE,
  mockUser, mockSession,
} from './fixtures';

const { prismaMock, bcryptMock, sendWelcomeEmailMock } = vi.hoisted(() => ({
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
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
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
    orgSettings: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  bcryptMock: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  sendWelcomeEmailMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@pluma-flags/db', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  compare: bcryptMock.compare,
  hash: bcryptMock.hash,
}));
// Mailer is fire-and-forget — mock it to prevent real SMTP connections in tests
vi.mock('../lib/mailer', () => ({
  sendWelcomeEmail: sendWelcomeEmailMock,
  initMailer: vi.fn(),
  closeMailer: vi.fn().mockResolvedValue(undefined),
}));

describe('Auth routes', () => {
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

  describe('GET /api/v1/auth/setup', () => {
    it('should return 200 with configured: true when a user exists', async () => {
      prismaMock.user.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/setup',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toEqual({ configured: true });
    });

    it('should return 404 with configured: false when no users exist', async () => {
      prismaMock.user.count.mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/setup',
      });

      expect(response.statusCode).toBe(404);
      const payload = JSON.parse(response.payload);
      expect(payload).toEqual({ configured: false });
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should create the first user as operator', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.user.create.mockResolvedValue({ ...mockUser, role: 'operator', passwordHash: 'hashed_pw' });
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default', allowedDomains: [], smtpFrom: '', sendWelcomeEmail: true, updatedAt: FIXED_DATE,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: mockUser.email, password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('id', USER_ID);
      expect(payload).toHaveProperty('email', mockUser.email);
      expect(payload).toHaveProperty('role', 'operator');
      expect(payload).toHaveProperty('disabled', false);
      expect(payload).not.toHaveProperty('passwordHash');
      // First user must be created with role: 'operator'
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: 'operator' }) }),
      );
      // Welcome email must be dispatched (fire-and-forget) when sendWelcomeEmail is true
      expect(sendWelcomeEmailMock).toHaveBeenCalledTimes(1);
      expect(sendWelcomeEmailMock).toHaveBeenCalledWith(mockUser.email, undefined);
    });

    it('should create subsequent users as user role (not 409)', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw2');
      prismaMock.user.create.mockResolvedValue({
        ...mockUser,
        id: 'another-user-id',
        email: 'other@example.com',
        role: 'user',
        passwordHash: 'hashed_pw2',
      });
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default', allowedDomains: [], smtpFrom: '', sendWelcomeEmail: true, updatedAt: FIXED_DATE,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'other@example.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('role', 'user');
      expect(payload).toHaveProperty('disabled', false);
      // Subsequent user must be created with role: 'user'
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: 'user' }) }),
      );
      // Welcome email must be dispatched for every successful registration when enabled
      expect(sendWelcomeEmailMock).toHaveBeenCalledTimes(1);
      expect(sendWelcomeEmailMock).toHaveBeenCalledWith('other@example.com', undefined);
    });

    it('should NOT send welcome email when sendWelcomeEmail is false', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.user.create.mockResolvedValue({
        ...mockUser, id: 'new-id', email: 'user@example.com', role: 'user', passwordHash: 'hashed_pw',
      });
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default', allowedDomains: [], smtpFrom: '', sendWelcomeEmail: false, updatedAt: FIXED_DATE,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@example.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
      expect(sendWelcomeEmailMock).not.toHaveBeenCalled();
    });

    it('should NOT send welcome email when no OrgSettings row exists', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.user.create.mockResolvedValue({
        ...mockUser, id: 'new-id', email: 'user@example.com', role: 'user', passwordHash: 'hashed_pw',
      });
      prismaMock.orgSettings.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@example.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
      expect(sendWelcomeEmailMock).not.toHaveBeenCalled();
    });

    it('should use smtpFrom from OrgSettings as the From address', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.user.create.mockResolvedValue({
        ...mockUser, id: 'new-id', email: 'user@company.com', role: 'user', passwordHash: 'hashed_pw',
      });
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default', allowedDomains: [], smtpFrom: 'noreply@company.com', sendWelcomeEmail: true, updatedAt: FIXED_DATE,
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@company.com', password: 'securepassword' },
      });

      expect(sendWelcomeEmailMock).toHaveBeenCalledWith('user@company.com', 'noreply@company.com');
    });

    it('should return 409 when email already exists (role user)', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.user.create.mockRejectedValue({ code: 'P2002' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: mockUser.email, password: 'securepassword' },
      });

      expect(response.statusCode).toBe(409);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('error');
    });

    it('should fall back to user role when concurrent operator registration fires P2002', async () => {
      // Simulate: count()=0 → role='operator', but another request already inserted operator
      prismaMock.user.count.mockResolvedValue(0);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      const p2002 = { code: 'P2002' };
      const retryUser = { ...mockUser, role: 'user', passwordHash: 'hashed_pw' };
      prismaMock.user.create
        .mockRejectedValueOnce(p2002)   // first attempt (role: 'operator') → unique index fires
        .mockResolvedValueOnce(retryUser); // retry (role: 'user') → succeeds

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: mockUser.email, password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('role', 'user');
      expect(prismaMock.user.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.user.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: 'user' }) }),
      );
    });

    it('should return 409 when email is also taken on the retry (concurrent race)', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      const p2002 = { code: 'P2002' };
      prismaMock.user.create
        .mockRejectedValueOnce(p2002)  // first attempt (role: 'operator')
        .mockRejectedValueOnce(p2002); // retry (role: 'user') → email conflict

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: mockUser.email, password: 'securepassword' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for invalid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: 'short' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 when email domain is not in allowedDomains', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default',
        allowedDomains: ['allowed.com'],
        updatedAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@notallowed.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(403);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('error', 'Email domain not allowed');
      // User should NOT be created
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should allow registration when email domain is in allowedDomains', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default',
        allowedDomains: ['allowed.com'],
        updatedAt: new Date(),
      });
      prismaMock.user.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: 'user@allowed.com',
        role: 'user',
        passwordHash: 'hashed_pw',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@allowed.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should allow registration when allowedDomains is empty (no restriction)', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default',
        allowedDomains: [],
        updatedAt: new Date(),
      });
      prismaMock.user.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: 'anyuser@anydomain.com',
        role: 'user',
        passwordHash: 'hashed_pw',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'anyuser@anydomain.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should allow registration when no OrgSettings row exists', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.orgSettings.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: 'anyuser@anydomain.com',
        role: 'user',
        passwordHash: 'hashed_pw',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'anyuser@anydomain.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
    });

    it('domain check is case-insensitive', async () => {
      prismaMock.user.count.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.orgSettings.findUnique.mockResolvedValue({
        id: 'default',
        allowedDomains: ['Allowed.COM'],
        updatedAt: new Date(),
      });
      prismaMock.user.create.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        email: 'user@allowed.com',
        role: 'user',
        passwordHash: 'hashed_pw',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@allowed.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and set a session cookie', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'hashed_pw' });
      bcryptMock.compare.mockResolvedValue(true);
      prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.session.create.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: mockUser.email, password: 'securepassword' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toContain('pluma_session=');
      expect(response.headers['set-cookie']).not.toMatch(/;\s*Secure/i);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('email', mockUser.email);
      expect(payload).toHaveProperty('role', mockUser.role);
      expect(payload).toHaveProperty('disabled', false);
      // All existing sessions should be invalidated on login
      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    });

    it('should return 401 for invalid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'hashed_pw' });
      bcryptMock.compare.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: mockUser.email, password: 'wrongpassword' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when user not found (always runs bcrypt to prevent timing attacks)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      bcryptMock.compare.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'notfound@example.com', password: 'securepassword' },
      });

      expect(response.statusCode).toBe(401);
      expect(bcryptMock.compare).toHaveBeenCalledTimes(1);
    });

    it('should return 401 when user account is disabled', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'hashed_pw', disabled: true });
      bcryptMock.compare.mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: mockUser.email, password: 'securepassword' },
      });

      expect(response.statusCode).toBe(401);
      // Session must NOT be created for disabled accounts
      expect(prismaMock.session.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear the session cookie', async () => {
      prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(204);
      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
        where: { token: SESSION_TOKEN },
      });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the current user with role and disabled fields', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('email', mockUser.email);
      expect(payload).toHaveProperty('role', mockUser.role);
      expect(payload).toHaveProperty('disabled', mockUser.disabled);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when session belongs to a disabled user', async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        ...mockSession,
        user: { ...mockUser, disabled: true },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password with valid credentials', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'old_hashed_pw' });
      // First call verifies old password is correct, second call checks if new password matches current
      bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      bcryptMock.hash.mockResolvedValue('new_hashed_pw');
      
      // Mock password history check (no matches)
      prismaMock.passwordHistory.findMany.mockResolvedValue([]);
      
      // Mock transaction — reuse prismaMock as the tx object so we can assert on it afterwards
      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown> | unknown) => {
          const tx = prismaMock;
          // Optimistic concurrency: count: 1 means the hash matched → update succeeded
          tx.user.updateMany.mockResolvedValue({ count: 1 });
          tx.passwordHistory.create.mockResolvedValue({ id: 'hist1', userId: USER_ID, passwordHash: 'old_hashed_pw', createdAt: new Date() });
          tx.passwordHistory.count.mockResolvedValue(1);
          tx.passwordHistory.findMany.mockResolvedValue([]);
          tx.passwordHistory.deleteMany.mockResolvedValue({ count: 0 });
          return callback(tx);
        },
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'oldpassword', newPassword: 'newpassword123' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toEqual({ message: 'Password updated' });
      expect(bcryptMock.compare).toHaveBeenCalledWith('oldpassword', 'old_hashed_pw');
      expect(bcryptMock.compare).toHaveBeenCalledWith('newpassword123', 'old_hashed_pw');
      expect(bcryptMock.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(prismaMock.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
        take: 4,
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID, passwordHash: 'old_hashed_pw' },
          data: { passwordHash: 'new_hashed_pw' },
        }),
      );
      expect(prismaMock.passwordHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: USER_ID, passwordHash: 'old_hashed_pw' } }),
      );
    });

    it('should return 409 when a concurrent password change is detected', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'old_hashed_pw' });
      // Old password valid, new password doesn't match current
      bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      bcryptMock.hash.mockResolvedValue('new_hashed_pw');

      // Mock password history check (no matches)
      prismaMock.passwordHistory.findMany.mockResolvedValue([]);

      // updateMany returns count: 0 → concurrent change was detected
      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown> | unknown) => {
          const tx = prismaMock;
          tx.user.updateMany.mockResolvedValue({ count: 0 });
          return callback(tx);
        },
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'oldpassword', newPassword: 'newpassword123' },
      });

      expect(response.statusCode).toBe(409);
      expect(prismaMock.passwordHistory.create).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        payload: { oldPassword: 'oldpassword', newPassword: 'newpassword123' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when old password is incorrect', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'old_hashed_pw' });
      bcryptMock.compare.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'wrongpassword', newPassword: 'newpassword123' },
      });

      expect(response.statusCode).toBe(401);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 for missing oldPassword', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { newPassword: 'newpassword123' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing newPassword', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'oldpassword' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when newPassword is too short', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'oldpassword', newPassword: 'short' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for empty oldPassword', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: '', newPassword: 'newpassword123' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 when user is not found in database', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'oldpassword', newPassword: 'newpassword123' },
      });

      expect(response.statusCode).toBe(401);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 when new password is same as old password', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'hashed_pw' });
      // First call verifies old password, second call checks if new password matches current hash
      bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'samepassword', newPassword: 'samepassword' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.payload).toContain('New password was recently used');
      expect(bcryptMock.compare).toHaveBeenCalledTimes(2);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject reusing the immediately previous password', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'current_hash' });
      
      // Old password valid, new password doesn't match current
      bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
      // Mock password history with one previous password
      const historyEntry = {
        id: 'hist1',
        userId: USER_ID,
        passwordHash: 'previous_hash',
        createdAt: new Date('2025-01-15'),
      };
      prismaMock.passwordHistory.findMany.mockResolvedValue([historyEntry]);
      
      // New password matches the previous password in history (Promise.all check)
      bcryptMock.compare.mockResolvedValueOnce(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'currentpassword', newPassword: 'previouspassword' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.payload).toContain('New password was recently used');
      expect(prismaMock.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
        take: 4,
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject reusing a password from the last 5', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'current_hash' });
      
      // Old password valid, new password doesn't match current
      bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
      // Mock password history with 4 previous passwords
      const historyEntries = [
        { id: 'hist1', userId: USER_ID, passwordHash: 'hash1', createdAt: new Date('2025-01-20') },
        { id: 'hist2', userId: USER_ID, passwordHash: 'hash2', createdAt: new Date('2025-01-15') },
        { id: 'hist3', userId: USER_ID, passwordHash: 'hash3', createdAt: new Date('2025-01-10') },
        { id: 'hist4', userId: USER_ID, passwordHash: 'hash4', createdAt: new Date('2025-01-05') },
      ];
      prismaMock.passwordHistory.findMany.mockResolvedValue(historyEntries);
      
      // All 4 historical comparisons run in parallel via Promise.all
      // One of them matches (doesn't matter which one for the test)
      bcryptMock.compare
        .mockResolvedValueOnce(false) // history[0]
        .mockResolvedValueOnce(false) // history[1]
        .mockResolvedValueOnce(true)  // history[2] - match!
        .mockResolvedValueOnce(false); // history[3]

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'currentpassword', newPassword: 'oldpassword3' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.payload).toContain('New password was recently used');
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should allow using a password outside the 5-entry history', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: 'current_hash' });
      
      // Old password valid, new password doesn't match current
      bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
      // Mock password history with 4 previous passwords
      const historyEntries = [
        { id: 'hist1', userId: USER_ID, passwordHash: 'hash1', createdAt: new Date('2025-01-20') },
        { id: 'hist2', userId: USER_ID, passwordHash: 'hash2', createdAt: new Date('2025-01-15') },
        { id: 'hist3', userId: USER_ID, passwordHash: 'hash3', createdAt: new Date('2025-01-10') },
        { id: 'hist4', userId: USER_ID, passwordHash: 'hash4', createdAt: new Date('2025-01-05') },
      ];
      prismaMock.passwordHistory.findMany.mockResolvedValue(historyEntries);
      
      // New password doesn't match any in history
      bcryptMock.compare
        .mockResolvedValueOnce(false) // history[0]
        .mockResolvedValueOnce(false) // history[1]
        .mockResolvedValueOnce(false) // history[2]
        .mockResolvedValueOnce(false); // history[3]
      
      bcryptMock.hash.mockResolvedValue('new_unique_hash');
      
      // Mock transaction
      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown> | unknown) => {
          const tx = prismaMock;
          tx.user.updateMany.mockResolvedValue({ count: 1 });
          tx.passwordHistory.create.mockResolvedValue({ 
            id: 'hist5', 
            userId: USER_ID, 
            passwordHash: 'current_hash', 
            createdAt: new Date() 
          });
          // count = 4 is below the pruning threshold (MAX_PASSWORD_HISTORY = 5), so no pruning occurs
          tx.passwordHistory.count.mockResolvedValue(4);
          tx.passwordHistory.deleteMany.mockResolvedValue({ count: 0 });
          return callback(tx);
        },
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { cookie: AUTH_COOKIE },
        payload: { oldPassword: 'currentpassword', newPassword: 'brandnewpassword123' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toEqual({ message: 'Password updated' });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });
});
