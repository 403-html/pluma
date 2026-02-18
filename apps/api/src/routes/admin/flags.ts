import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth.js';

const flagBodySchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  enabled: z.boolean().optional().default(false),
});

const flagUpdateBodySchema = z
  .object({
    key: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(200).optional(),
    enabled: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.key !== undefined || body.name !== undefined || body.enabled !== undefined,
    { message: 'At least one field is required' },
  );

const projectParamsSchema = z.object({
  id: z.uuid(),
});

const flagParamsSchema = z.object({
  id: z.uuid(),
  flagId: z.uuid(),
});

export async function registerFlagRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/projects/:id/flags
   */
  fastify.get('/projects/:id/flags', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!project) {
      return reply.notFound('Project not found');
    }

    return prisma.featureFlag.findMany({
      where: { projectId: parsedParams.data.id },
      orderBy: { createdAt: 'desc' },
    });
  });

  /**
   * POST /api/v1/projects/:id/flags
   */
  fastify.post('/projects/:id/flags', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    const parsedBody = flagBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    if (!parsedBody.success) {
      return reply.badRequest('Invalid flag payload');
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!project) {
      return reply.notFound('Project not found');
    }

    try {
      const flag = await prisma.featureFlag.create({
        data: {
          projectId: parsedParams.data.id,
          key: parsedBody.data.key,
          name: parsedBody.data.name,
          enabled: parsedBody.data.enabled,
        },
      });

      return reply.code(StatusCodes.CREATED).send(flag);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return reply.conflict('Flag key already exists in this project');
      }

      throw error;
    }
  });

  /**
   * PATCH /api/v1/projects/:id/flags/:flagId
   */
  fastify.patch(
    '/projects/:id/flags/:flagId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = flagParamsSchema.safeParse(request.params);
      const parsedBody = flagUpdateBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        return reply.badRequest('Invalid params');
      }

      if (!parsedBody.success) {
        return reply.badRequest('Invalid flag payload');
      }

      try {
        const flag = await prisma.featureFlag.update({
          where: {
            id: parsedParams.data.flagId,
            projectId: parsedParams.data.id,
          },
          data: parsedBody.data,
        });

        return flag;
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          return reply.notFound('Flag not found');
        }

        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          return reply.conflict('Flag key already exists in this project');
        }

        throw error;
      }
    },
  );

  /**
   * DELETE /api/v1/projects/:id/flags/:flagId
   */
  fastify.delete(
    '/projects/:id/flags/:flagId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = flagParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.badRequest('Invalid params');
      }

      try {
        await prisma.featureFlag.delete({
          where: {
            id: parsedParams.data.flagId,
            projectId: parsedParams.data.id,
          },
        });

        return reply.code(StatusCodes.NO_CONTENT).send();
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          return reply.notFound('Flag not found');
        }

        throw error;
      }
    },
  );
}
