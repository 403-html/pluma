import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from './app';
import type { FastifyInstance } from 'fastify';

vi.mock('@pluma/db', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('API Health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 on /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });

  it('should return correct health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const payload = JSON.parse(response.payload);
    
    expect(payload).toHaveProperty('status', 'ok');
    expect(payload).toHaveProperty('timestamp');
    expect(Number.isNaN(new Date(payload.timestamp).getTime())).toBe(false);
  });

});
