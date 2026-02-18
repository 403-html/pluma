import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pluma/db';
import { generateSdkToken, hashSdkToken } from '../auth/sdk-token.js';

const environmentParamsSchema = z.object({
  envId: z.uuid(),
});

const sdkTokenParamsSchema = z.object({
  id: z.uuid(),
});

export async function registerSdkTokenRoutes(fastify: FastifyInstance) {
  fastify.post('/environments/:envId/sdk-tokens', async (request, reply) => {
    const parsedParams = environmentParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid environment id');
    }

    const environment = await prisma.environment.findUnique({
      where: { id: parsedParams.data.envId },
      select: { id: true },
    });

    if (!environment) {
      return reply.notFound('Environment not found');
    }

    const token = generateSdkToken();
    const tokenHash = hashSdkToken(token);

    const sdkToken = await prisma.sdkToken.create({
      data: {
        environmentId: environment.id,
        tokenHash,
      },
    });

    return reply.code(201).send({
      id: sdkToken.id,
      environmentId: sdkToken.environmentId,
      token,
      createdAt: sdkToken.createdAt,
    });
  });

  fastify.get('/environments/:envId/sdk-tokens', async (request, reply) => {
    const parsedParams = environmentParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid environment id');
    }

    const environment = await prisma.environment.findUnique({
      where: { id: parsedParams.data.envId },
      select: { id: true },
    });

    if (!environment) {
      return reply.notFound('Environment not found');
    }

    return prisma.sdkToken.findMany({
      where: { environmentId: environment.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        environmentId: true,
        createdAt: true,
      },
    });
  });

  fastify.delete('/sdk-tokens/:id', async (request, reply) => {
    const parsedParams = sdkTokenParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid token id');
    }

    try {
      await prisma.sdkToken.delete({
        where: { id: parsedParams.data.id },
      });

      return reply.code(204).send();
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        return reply.notFound('SDK token not found');
      }

      throw error;
    }
  });
}
