import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { PROJECT_ID, AUTH_COOKIE, mockSession } from './fixtures';

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
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@pluma/db', () => ({
  prisma: prismaMock,
}));

describe('API Projects', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a valid session for all admin routes
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
  });

  it('should return 401 when no session cookie', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should list projects', async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: PROJECT_ID,
        key: 'alpha',
        name: 'Alpha',
        createdAt: new Date(),
        updatedAt: new Date(),
        environments: [
          { id: 'env-1', key: 'dev', name: 'Development' },
          { id: 'env-2', key: 'prod', name: 'Production' },
        ],
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.project.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    const projects = JSON.parse(response.payload);
    expect(projects).toHaveLength(1);
    expect(projects[0]).toHaveProperty('environments');
    expect(projects[0].environments).toHaveLength(2);
    expect(projects[0]).not.toHaveProperty('featureFlags');
  });

  it('should create a project', async () => {
    prismaMock.project.create.mockResolvedValue({
      id: PROJECT_ID,
      key: 'alpha',
      name: 'Alpha',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { key: 'alpha', name: 'Alpha' },
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: { key: 'alpha', name: 'Alpha' },
    });
  });

  it('should get a project by id', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      key: 'alpha',
      name: 'Alpha',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${PROJECT_ID}`,
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.project.findUnique).toHaveBeenCalledTimes(1);
  });

  it('should return 404 when project is not found', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${PROJECT_ID}`,
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should update a project', async () => {
    prismaMock.project.update.mockResolvedValue({
      id: PROJECT_ID,
      key: 'alpha',
      name: 'Alpha Updated',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${PROJECT_ID}`,
      payload: { name: 'Alpha Updated' },
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: { name: 'Alpha Updated' },
    });
  });

  it('should return 400 when creating a project with key too long', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { key: 'a'.repeat(101), name: 'Alpha' },
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it('should return 400 when creating a project with name too long', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { key: 'alpha', name: 'a'.repeat(201) },
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it('should return 400 when updating a project with key too long', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${PROJECT_ID}`,
      payload: { key: 'a'.repeat(101) },
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.project.update).not.toHaveBeenCalled();
  });

  it('should return 400 when updating a project with no fields', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${PROJECT_ID}`,
      payload: {},
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMock.project.update).not.toHaveBeenCalled();
  });

  it('should delete a project', async () => {
    const projectData = {
      id: PROJECT_ID,
      key: 'alpha',
      name: 'Alpha',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.project.findUnique.mockResolvedValue(projectData);
    prismaMock.project.delete.mockResolvedValue(projectData);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${PROJECT_ID}`,
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(204);
    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
    });
    expect(prismaMock.project.delete).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
    });
  });
});
