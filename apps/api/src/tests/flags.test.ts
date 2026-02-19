import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  PROJECT_ID, FLAG_ID, AUTH_COOKIE,
  mockSession, mockProject, mockFlag,
} from './fixtures';

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
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
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    flagConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn() as any,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) => fn(prismaMock));
  return { prismaMock };
});

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));

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
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
  });

  describe('GET /api/v1/projects/:projectId/flags', () => {
    it('should list flags for a project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.featureFlag.findMany.mockResolvedValue([mockFlag]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveLength(1);
      expect(payload[0]).toHaveProperty('key', mockFlag.key);
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/projects/:projectId/flags', () => {
    it('should create a flag', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.featureFlag.create.mockResolvedValue(mockFlag);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        payload: { key: mockFlag.key, name: mockFlag.name },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('key', mockFlag.key);
    });

    it('should return 404 when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        payload: { key: 'dark-mode', name: 'Dark Mode' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 when flag key already exists', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.featureFlag.create.mockRejectedValue({ code: 'P2002' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${PROJECT_ID}/flags`,
        payload: { key: 'dark-mode', name: 'Dark Mode' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('PATCH /api/v1/flags/:flagId', () => {
    it('should update a flag', async () => {
      prismaMock.featureFlag.update.mockResolvedValue({ ...mockFlag, name: 'Dark Mode Updated' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/flags/${FLAG_ID}`,
        payload: { name: 'Dark Mode Updated' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('name', 'Dark Mode Updated');
    });

    it('should return 404 when flag not found', async () => {
      prismaMock.featureFlag.update.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/flags/${FLAG_ID}`,
        payload: { name: 'New Name' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 when flag key already exists', async () => {
      prismaMock.featureFlag.update.mockRejectedValue({ code: 'P2002' });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/flags/${FLAG_ID}`,
        payload: { key: 'existing-key' },
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/v1/flags/:flagId', () => {
    it('should delete a flag', async () => {
      prismaMock.featureFlag.delete.mockResolvedValue(mockFlag);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/flags/${FLAG_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 404 when flag not found', async () => {
      prismaMock.featureFlag.delete.mockRejectedValue({ code: 'P2025' });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/flags/${FLAG_ID}`,
        headers: { cookie: AUTH_COOKIE },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
