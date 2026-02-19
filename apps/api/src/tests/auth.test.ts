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
});
