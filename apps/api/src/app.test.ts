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

describe('Prisma Error Handling', () => {
  it('should handle Prisma errors with 500 response', async () => {
    // Create a mock Prisma error
    class PrismaClientKnownRequestError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'PrismaClientKnownRequestError';
      }
    }

    // Create a fresh app instance for this test
    const testApp = await buildApp({ logger: false });

    // Register a test route that throws a Prisma error
    testApp.get('/test-prisma-error', async () => {
      throw new PrismaClientKnownRequestError('Test Prisma error');
    });

    const response = await testApp.inject({
      method: 'GET',
      url: '/test-prisma-error',
    });

    expect(response.statusCode).toBe(500);
    const payload = JSON.parse(response.payload);
    expect(payload).toEqual({ message: 'Internal Server Error' });

    await testApp.close();
  });
});
