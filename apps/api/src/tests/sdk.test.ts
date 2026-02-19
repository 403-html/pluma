import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  PROJECT_ID, ENV_ID, AUTH_COOKIE,
  RAW_SDK_TOKEN, SDK_TOKEN_HASH,
  mockSession, mockSdkToken, mockEnvironmentWithProject, mockProject,
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
      ...mockSdkToken,
      revokedAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { authorization: `Bearer ${RAW_SDK_TOKEN}` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 401 when session cookie is used instead of Bearer token', async () => {
    prismaMock.session.findUnique.mockResolvedValue(mockSession);

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { cookie: AUTH_COOKIE },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 401 for project-scoped tokens (no envId)', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue({
      ...mockSdkToken,
      envId: null,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { authorization: `Bearer ${RAW_SDK_TOKEN}` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return env-scoped flag snapshot for a valid env token', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue(mockSdkToken);
    prismaMock.environment.findUnique.mockResolvedValue({ ...mockEnvironmentWithProject, configVersion: 3 });
    prismaMock.featureFlag.findMany.mockResolvedValue([
      { id: 'flag-1', key: 'dark-mode', projectId: PROJECT_ID },
      { id: 'flag-2', key: 'new-ui', projectId: PROJECT_ID },
    ]);
    prismaMock.flagConfig.findMany.mockResolvedValue([
      { envId: ENV_ID, flagId: 'flag-1', enabled: true },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { authorization: `Bearer ${RAW_SDK_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload).toHaveProperty('version', 3);
    expect(payload).toHaveProperty('projectKey', mockProject.key);
    expect(payload).toHaveProperty('envKey', mockEnvironmentWithProject.key);
    expect(payload.flags).toHaveLength(2);
    expect(payload.flags.find((f: { key: string }) => f.key === 'dark-mode')).toMatchObject({ key: 'dark-mode', enabled: true });
    expect(payload.flags.find((f: { key: string }) => f.key === 'new-ui')).toMatchObject({ key: 'new-ui', enabled: false });
    expect(response.headers['etag']).toBe('3');
  });

  it('should return 304 when If-None-Match matches current version', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue(mockSdkToken);
    prismaMock.environment.findUnique.mockResolvedValue({ ...mockEnvironmentWithProject, configVersion: 3 });

    const response = await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: {
        authorization: `Bearer ${RAW_SDK_TOKEN}`,
        'if-none-match': '3',
      },
    });

    expect(response.statusCode).toBe(304);
    expect(prismaMock.featureFlag.findMany).not.toHaveBeenCalled();
  });

  it('should verify the SDK token lookup uses the correct hash', async () => {
    prismaMock.sdkToken.findUnique.mockResolvedValue(mockSdkToken);
    prismaMock.environment.findUnique.mockResolvedValue(mockEnvironmentWithProject);
    prismaMock.featureFlag.findMany.mockResolvedValue([]);
    prismaMock.flagConfig.findMany.mockResolvedValue([]);

    await app.inject({
      method: 'GET',
      url: '/sdk/v1/snapshot',
      headers: { authorization: `Bearer ${RAW_SDK_TOKEN}` },
    });

    expect(prismaMock.sdkToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: SDK_TOKEN_HASH },
    });
  });
});
