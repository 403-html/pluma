import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  PROJECT_ID, ENV_ID, FLAG_ID, AUTH_COOKIE,
  mockSession, mockProject, mockEnvironment,
} from './fixtures';

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
      count: vi.fn(),
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
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
  });

  describe('GET /api/v1/projects/:projectId/environments', () => {
    it('should list environments for a project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.environment.findMany.mockResolvedValue([
        {
          ...mockEnvironment,
          flagConfigs: [{ flagId: FLAG_ID }],
        },
      ]);
      prismaMock.featureFlag.count.mockResolvedValue(5);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('key', mockEnvironment.key);
      expect(payload[0]).toHaveProperty('flagStats', { total: 5, enabled: 1 });
    });

    it('should reflect total as project flag count even when no FlagConfigs exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.environment.findMany.mockResolvedValue([
        {
          ...mockEnvironment,
          flagConfigs: [],
        },
      ]);
      prismaMock.featureFlag.count.mockResolvedValue(3);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload[0]).toHaveProperty('flagStats', { total: 3, enabled: 0 });
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        headers: { cookie: AUTH_COOKIE },
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
      prismaMock.environment.create.mockResolvedValue(mockEnvironment);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        payload: { key: mockEnvironment.key, name: mockEnvironment.name },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('key', mockEnvironment.key);
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        payload: { key: 'staging', name: 'Staging' },
        headers: { cookie: AUTH_COOKIE },
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
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for invalid payload', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/environments`,
        payload: {},
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/environments/:envId', () => {
    it('should update an environment', async () => {
      prismaMock.environment.update.mockResolvedValue({ ...mockEnvironment, name: 'Staging Updated' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}`,
        payload: { name: 'Staging Updated' },
        headers: { cookie: AUTH_COOKIE },
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
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 when env key already exists', async () => {
      prismaMock.environment.update.mockRejectedValue({ code: 'P2002' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}`,
        payload: { key: 'production' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 for invalid payload with no fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/environments/${ENV_ID}`,
        payload: {},
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/environments/:envId', () => {
    it('should delete an environment', async () => {
      prismaMock.environment.delete.mockResolvedValue(mockEnvironment);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/environments/${ENV_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 when environment not found', async () => {
      prismaMock.environment.delete.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/environments/${ENV_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
