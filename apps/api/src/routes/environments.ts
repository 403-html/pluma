import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pluma/db';

const projectParamsSchema = z.object({
  projectId: z.uuid(),
});

const environmentParamsSchema = z.object({
  envId: z.uuid(),
});

const environmentBodySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
});

const environmentUpdateBodySchema = z
  .object({
    key: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .refine((body) => body.key !== undefined || body.name !== undefined, {
    message: 'At least one field is required',
  });

export async function registerEnvironmentRoutes(fastify: FastifyInstance) {
  fastify.get('/projects/:projectId/environments', async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
    });

    if (!project) {
      return reply.notFound('Project not found');
    }

    return prisma.environment.findMany({
      where: { projectId: parsedParams.data.projectId },
      orderBy: { createdAt: 'desc' },
    });
  });

  fastify.post('/projects/:projectId/environments', async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    const parsedBody = environmentBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    if (!parsedBody.success) {
      return reply.badRequest('Invalid environment payload');
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
    });

    if (!project) {
      return reply.notFound('Project not found');
    }

    try {
      const environment = await prisma.environment.create({
        data: {
          projectId: parsedParams.data.projectId,
          ...parsedBody.data,
        },
      });

      return reply.code(201).send(environment);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return reply.conflict('Environment key already exists');
      }

      throw error;
    }
  });

  fastify.patch('/environments/:envId', async (request, reply) => {
    const parsedParams = environmentParamsSchema.safeParse(request.params);
    const parsedBody = environmentUpdateBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid environment id');
    }

    if (!parsedBody.success) {
      return reply.badRequest('Invalid environment payload');
    }

    try {
      const environment = await prisma.environment.update({
        where: { id: parsedParams.data.envId },
        data: parsedBody.data,
      });

      return environment;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        return reply.notFound('Environment not found');
      }

      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return reply.conflict('Environment key already exists');
      }

      throw error;
    }
  });

  fastify.delete('/environments/:envId', async (request, reply) => {
    const parsedParams = environmentParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid environment id');
    }

    try {
      await prisma.environment.delete({
        where: { id: parsedParams.data.envId },
      });

      return reply.code(204).send();
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        return reply.notFound('Environment not found');
      }

      throw error;
    }
  });
}
