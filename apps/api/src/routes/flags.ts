import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pluma/db';

const projectParamsSchema = z.object({
  projectId: z.uuid(),
});

const flagParamsSchema = z.object({
  flagId: z.uuid(),
});

const flagBodySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
});

const flagUpdateBodySchema = z
  .object({
    key: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  })
  .refine((body) => body.key !== undefined || body.name !== undefined || body.description !== undefined, {
    message: 'At least one field is required',
  });

const flagQuerySchema = z.object({
  tree: z.string().optional(),
});

export async function registerFlagRoutes(fastify: FastifyInstance) {
  fastify.get('/projects/:projectId/flags', async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    const parsedQuery = flagQuerySchema.safeParse(request.query);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    if (!parsedQuery.success) {
      return reply.badRequest('Invalid query');
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
    });

    if (!project) {
      return reply.notFound('Project not found');
    }

    const includeTree = parsedQuery.data.tree === '1';

    if (!includeTree) {
      return prisma.flag.findMany({
        where: { projectId: parsedParams.data.projectId },
        orderBy: { createdAt: 'desc' },
      });
    }

    const flags = await prisma.flag.findMany({
      where: { projectId: parsedParams.data.projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        configurations: {
          include: {
            environment: { select: { id: true, key: true, name: true } },
          },
        },
      },
    });

    return flags.map(({ configurations, ...flag }) => ({
      ...flag,
      environments: configurations.map((configuration) => ({
        environmentId: configuration.environmentId,
        key: configuration.environment.key,
        name: configuration.environment.name,
        enabled: configuration.enabled,
        value: configuration.value,
      })),
    }));
  });

  fastify.post('/projects/:projectId/flags', async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    const parsedBody = flagBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    if (!parsedBody.success) {
      return reply.badRequest('Invalid flag payload');
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
    });

    if (!project) {
      return reply.notFound('Project not found');
    }

    try {
      const flag = await prisma.flag.create({
        data: {
          projectId: parsedParams.data.projectId,
          ...parsedBody.data,
        },
      });

      return reply.code(201).send(flag);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return reply.conflict('Flag key already exists');
      }

      throw error;
    }
  });

  fastify.patch('/flags/:flagId', async (request, reply) => {
    const parsedParams = flagParamsSchema.safeParse(request.params);
    const parsedBody = flagUpdateBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid flag id');
    }

    if (!parsedBody.success) {
      return reply.badRequest('Invalid flag payload');
    }

    try {
      const flag = await prisma.flag.update({
        where: { id: parsedParams.data.flagId },
        data: parsedBody.data,
      });

      return flag;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        return reply.notFound('Flag not found');
      }

      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return reply.conflict('Flag key already exists');
      }

      throw error;
    }
  });

  fastify.delete('/flags/:flagId', async (request, reply) => {
    const parsedParams = flagParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid flag id');
    }

    try {
      await prisma.flag.delete({
        where: { id: parsedParams.data.flagId },
      });

      return reply.code(204).send();
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        return reply.notFound('Flag not found');
      }

      throw error;
    }
  });
}
