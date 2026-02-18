import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
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
      request.log.warn({ params: request.params }, 'GET /projects/:id/flags rejected: invalid id');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!project) {
      request.log.warn({ projectId: parsedParams.data.id }, 'GET /projects/:id/flags rejected: project not found');
      return reply.notFound(ReasonPhrases.NOT_FOUND);
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
      request.log.warn({ params: request.params }, 'POST /projects/:id/flags rejected: invalid id');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /projects/:id/flags rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!project) {
      request.log.warn({ projectId: parsedParams.data.id }, 'POST /projects/:id/flags rejected: project not found');
      return reply.notFound(ReasonPhrases.NOT_FOUND);
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
        request.log.warn({ projectId: parsedParams.data.id, key: parsedBody.data.key }, 'POST /projects/:id/flags rejected: flag key already exists');
        return reply.conflict(ReasonPhrases.CONFLICT);
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
        request.log.warn({ params: request.params }, 'PATCH /projects/:id/flags/:flagId rejected: invalid params');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'PATCH /projects/:id/flags/:flagId rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
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
          request.log.warn({ flagId: parsedParams.data.flagId, projectId: parsedParams.data.id }, 'PATCH /projects/:id/flags/:flagId rejected: flag not found');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          request.log.warn({ flagId: parsedParams.data.flagId, key: parsedBody.data.key }, 'PATCH /projects/:id/flags/:flagId rejected: flag key already exists');
          return reply.conflict(ReasonPhrases.CONFLICT);
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
        request.log.warn({ params: request.params }, 'DELETE /projects/:id/flags/:flagId rejected: invalid params');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
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
          request.log.warn({ flagId: parsedParams.data.flagId, projectId: parsedParams.data.id }, 'DELETE /projects/:id/flags/:flagId rejected: flag not found');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        throw error;
      }
    },
  );
}
