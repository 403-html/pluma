import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';

const PROJECT_ID = '33333333-3333-3333-3333-333333333333';
const RAW_TOKEN = 'pluma_' + 'a'.repeat(64);
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');

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

describe('SDK snapshot', () => {
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

  it('should return 401 without a Bearer token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 401 with an invalid token', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { authorization: 'Bearer invalid_token' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 401 with a revoked token', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue({
      id: 'token-id',
      projectId: PROJECT_ID,
      tokenHash: TOKEN_HASH,
      name: 'CI Token',
      createdAt: new Date(),
      revokedAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { authorization: `Bearer ${RAW_TOKEN}` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return flag snapshot for a valid token', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue({
      id: 'token-id',
      projectId: PROJECT_ID,
      tokenHash: TOKEN_HASH,
      name: 'CI Token',
      createdAt: new Date(),
      revokedAt: null,
    });
    prismaMock.featureFlag.findMany.mockResolvedValue([
      { key: 'dark-mode', enabled: true },
      { key: 'new-ui', enabled: false },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { authorization: `Bearer ${RAW_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload).toHaveProperty('projectId', PROJECT_ID);
    expect(payload.flags).toHaveLength(2);
    expect(prismaMock.sdkToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: TOKEN_HASH },
    });
  });
});
