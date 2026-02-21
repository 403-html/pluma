import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  USER_ID, SESSION_TOKEN, AUTH_COOKIE,
  mockUser, mockSession,
} from './fixtures';

const { prismaMock, bcryptMock } = vi.hoisted(() => ({
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
    $transaction: vi.fn(),
  },
  bcryptMock: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  compare: bcryptMock.compare,
  hash: bcryptMock.hash,
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
    it('should create the first admin user', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      bcryptMock.hash.mockResolvedValue('hashed_pw');
      prismaMock.user.create.mockResolvedValue({ ...mockUser, passwordHash: 'hashed_pw' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: mockUser.email, password: 'securepassword' },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('id', USER_ID);
      expect(payload).toHaveProperty('email', mockUser.email);
      expect(payload).not.toHaveProperty('passwordHash');
    });

    it('should return 409 when an admin user already exists', async () => {
      prismaMock.user.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'other@example.com', password: 'securepassword' },
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
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('email', mockUser.email);
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
    it('should return the current user', async () => {
      prismaMock.session.findUnique.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('email', mockUser.email);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
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
      
      // Mock transaction
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            update: vi.fn().mockResolvedValue({ ...mockUser, passwordHash: 'new_hashed_pw' }),
          },
          passwordHistory: {
            create: vi.fn().mockResolvedValue({ id: 'hist1', userId: USER_ID, passwordHash: 'old_hashed_pw', createdAt: new Date() }),
            count: vi.fn().mockResolvedValue(1),
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(tx);
      });

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
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            update: vi.fn().mockResolvedValue({ ...mockUser, passwordHash: 'new_unique_hash' }),
          },
          passwordHistory: {
            create: vi.fn().mockResolvedValue({ 
              id: 'hist5', 
              userId: USER_ID, 
              passwordHash: 'current_hash', 
              createdAt: new Date() 
            }),
            count: vi.fn().mockResolvedValue(5),
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(tx);
      });

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
