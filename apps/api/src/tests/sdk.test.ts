import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    sdkToken: {
      findUnique: vi.fn(),
    },
    flag: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@pluma/db', () => ({
  prisma: prismaMock,
}));

describe('SDK Snapshot', () => {
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

  it('should require an SDK token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return a snapshot scoped to the token environment', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue({
      id: 'token-id',
      environmentId: 'env-id',
      environment: { id: 'env-id', projectId: 'project-id' },
    });

    prismaMock.flag.findMany.mockResolvedValue([
      {
        key: 'new-feature',
        configurations: [{ enabled: true, value: 'on' }],
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot?projectId=override',
      headers: { authorization: 'Bearer plm_sdk_testtoken' },
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.flag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'project-id' } }),
    );
    expect(JSON.parse(response.payload)).toEqual({
      environmentId: 'env-id',
      flags: {
        'new-feature': {
          enabled: true,
          value: 'on',
        },
      },
    });
  });
});
