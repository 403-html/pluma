import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

const credentials = { email: 'admin@pluma.local', password: 'pluma-admin' };

process.env.ADMIN_EMAIL = credentials.email;
process.env.ADMIN_PASSWORD = credentials.password;

const getSessionCookie = (setCookie?: string | string[]) => {
  const cookieValue = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieValue?.split(';')[0] ?? '';
};

vi.mock('@pluma/db', () => ({
  prisma: {
    project: {},
    environment: {},
    flag: {},
    flagConfiguration: {},
    sdkToken: {},
  },
}));

describe('API Auth', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should login and set session cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: credentials,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should return current admin with a session', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: credentials,
    });

    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toMatchObject({ userId: credentials.email, role: 'admin' });
  });

  it('should reject requests without a session', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });
});
