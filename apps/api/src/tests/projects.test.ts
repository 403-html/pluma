import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  });

  it('should list projects', async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: '8becc1f9-39b2-4d73-ab84-a61f487d117a',
        key: 'alpha',
        name: 'Alpha',
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/projects',
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.project.findMany).toHaveBeenCalledTimes(1);
    expect(JSON.parse(response.payload)).toHaveLength(1);
  });

  it('should create a project', async () => {
    prismaMock.project.create.mockResolvedValue({
      id: '8becc1f9-39b2-4d73-ab84-a61f487d117a',
      key: 'alpha',
      name: 'Alpha',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { key: 'alpha', name: 'Alpha' },
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: { key: 'alpha', name: 'Alpha' },
    });
  });

  it('should get a project by id', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: '8becc1f9-39b2-4d73-ab84-a61f487d117a',
      key: 'alpha',
      name: 'Alpha',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/projects/8becc1f9-39b2-4d73-ab84-a61f487d117a',
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.project.findUnique).toHaveBeenCalledTimes(1);
  });

  it('should return 404 when project is not found', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/projects/8becc1f9-39b2-4d73-ab84-a61f487d117a',
    });

    expect(response.statusCode).toBe(404);
  });

  it('should update a project', async () => {
    prismaMock.project.update.mockResolvedValue({
      id: '8becc1f9-39b2-4d73-ab84-a61f487d117a',
      key: 'alpha',
      name: 'Alpha Updated',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/projects/8becc1f9-39b2-4d73-ab84-a61f487d117a',
      payload: { name: 'Alpha Updated' },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: '8becc1f9-39b2-4d73-ab84-a61f487d117a' },
      data: { name: 'Alpha Updated' },
    });
  });

  it('should delete a project', async () => {
    prismaMock.project.delete.mockResolvedValue({
      id: '8becc1f9-39b2-4d73-ab84-a61f487d117a',
      key: 'alpha',
      name: 'Alpha',
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/projects/8becc1f9-39b2-4d73-ab84-a61f487d117a',
    });

    expect(response.statusCode).toBe(204);
    expect(prismaMock.project.delete).toHaveBeenCalledWith({
      where: { id: '8becc1f9-39b2-4d73-ab84-a61f487d117a' },
    });
  });
});
