import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

const SESSION_TOKEN = 'envs-test-session-token';
const USER_ID = '44444444-4444-4444-4444-444444444444';
const PROJECT_ID = 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee';
const ENV_ID = 'ffffffff-ffff-4fff-afff-ffffffffffff';

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

const mockProject = { id: PROJECT_ID, key: 'my-project', name: 'My Project', createdAt: new Date(), updatedAt: new Date() };
const mockEnv = { id: ENV_ID, projectId: PROJECT_ID, key: 'staging', name: 'Staging', createdAt: new Date(), updatedAt: new Date() };

describe('Environment routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'session-id',
      token: SESSION_TOKEN,
      expiresAt: new Date(Date.now() + 60_000),
      userId: USER_ID,
      createdAt: new Date(),
      user: { id: USER_ID, email: 'admin@example.com', createdAt: new Date(), passwordHash: 'hash' },
    });
  });

  const authCookie = `pluma_session=${SESSION_TOKEN}`;

  describe('GET /api/v1/projects/:projectId/environments', () => {
    it('should list environments for a project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.environment.findMany.mockResolvedValue([mockEnv]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('key', 'staging');
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 when no session cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/projects/:projectId/environments', () => {
    it('should create an environment', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.environment.create.mockResolvedValue(mockEnv);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        payload: { key: 'staging', name: 'Staging' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('key', 'staging');
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        payload: { key: 'staging', name: 'Staging' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 when env key already exists in project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.environment.create.mockRejectedValue({ code: 'P2002' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        payload: { key: 'staging', name: 'Staging' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for invalid payload', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        payload: {},
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/environments/:envId', () => {
    it('should update an environment', async () => {
      prismaMock.environment.update.mockResolvedValue({ ...mockEnv, name: 'Staging Updated' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}`,
        payload: { name: 'Staging Updated' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('name', 'Staging Updated');
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.update.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}`,
        payload: { name: 'New Name' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 when env key already exists', async () => {
      prismaMock.environment.update.mockRejectedValue({ code: 'P2002' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}`,
        payload: { key: 'production' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for invalid payload with no fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}`,
        payload: {},
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/environments/:envId', () => {
    it('should delete an environment', async () => {
      prismaMock.environment.delete.mockResolvedValue(mockEnv);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/environments/${ENV_ID}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.delete.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/environments/${ENV_ID}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
