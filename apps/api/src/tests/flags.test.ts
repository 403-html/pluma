import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

const SESSION_TOKEN = 'flags-test-session-token';
const USER_ID = '33333333-3333-3333-3333-333333333333';
const PROJECT_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const FLAG_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

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
  },
}));

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));

const mockProject = { id: PROJECT_ID, key: 'test-project', name: 'Test Project', createdAt: new Date(), updatedAt: new Date() };
const mockFlag = { id: FLAG_ID, projectId: PROJECT_ID, key: 'dark-mode', name: 'Dark Mode', enabled: false, createdAt: new Date(), updatedAt: new Date() };

describe('Feature Flag routes', () => {
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

  describe('GET /api/v1/projects/:id/flags', () => {
    it('should list flags for a project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('key', 'dark-mode');
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/projects/:id/flags', () => {
    it('should create a flag', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.featureFlag.create.mockResolvedValue(mockFlag);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        payload: { key: 'dark-mode', name: 'Dark Mode' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('key', 'dark-mode');
    });

    it('should return 409 when flag key already exists', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.featureFlag.create.mockRejectedValue({ code: 'P2002' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        payload: { key: 'dark-mode', name: 'Dark Mode' },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for invalid payload', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        payload: {},
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/projects/:id/flags/:flagId', () => {
    it('should update a flag', async () => {
      prismaMock.featureFlag.update.mockResolvedValue({ ...mockFlag, enabled: true });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/${PROJECT_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('enabled', true);
    });

    it('should return 404 when flag not found', async () => {
      prismaMock.featureFlag.update.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/${PROJECT_ID}/flags/${FLAG_ID}`,
        payload: { enabled: true },
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/projects/:id/flags/:flagId', () => {
    it('should delete a flag', async () => {
      prismaMock.featureFlag.delete.mockResolvedValue(mockFlag);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${PROJECT_ID}/flags/${FLAG_ID}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 when flag not found', async () => {
      prismaMock.featureFlag.delete.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${PROJECT_ID}/flags/${FLAG_ID}`,
        headers: { cookie: authCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
