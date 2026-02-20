import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';

const flagBodySchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  parentFlagId: z.uuid().optional(),
});

const flagUpdateBodySchema = z
  .object({
    key: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional().nullable(),
  })
  .refine(
    (body) =>
      body.key !== undefined || body.name !== undefined || body.description !== undefined,
    { message: 'At least one field is required' },
  );

const projectParamsSchema = z.object({
  projectId: z.uuid(),
});

const flagParamsSchema = z.object({
  flagId: z.uuid(),
});

export async function registerFlagRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/projects/:projectId/flags
   */
  fastify.get('/projects/:projectId/flags', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      request.log.warn({ params: request.params }, 'GET /projects/:projectId/flags rejected: invalid projectId');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
    });

    if (!project) {
      request.log.warn({ projectId: parsedParams.data.projectId }, 'GET /projects/:projectId/flags rejected: project not found');
      return reply.notFound(ReasonPhrases.NOT_FOUND);
    }

    return prisma.featureFlag.findMany({
      where: { projectId: parsedParams.data.projectId },
      orderBy: { createdAt: 'desc' },
    });
  });

  /**
   * POST /api/v1/projects/:projectId/flags
   */
  fastify.post('/projects/:projectId/flags', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    const parsedBody = flagBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      request.log.warn({ params: request.params }, 'POST /projects/:projectId/flags rejected: invalid projectId');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /projects/:projectId/flags rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.projectId },
    });

    if (!project) {
      request.log.warn({ projectId: parsedParams.data.projectId }, 'POST /projects/:projectId/flags rejected: project not found');
      return reply.notFound(ReasonPhrases.NOT_FOUND);
    }

    if (parsedBody.data.parentFlagId !== undefined) {
      const parentFlag = await prisma.featureFlag.findUnique({
        where: { id: parsedBody.data.parentFlagId },
      });

      if (!parentFlag) {
        request.log.warn({ parentFlagId: parsedBody.data.parentFlagId }, 'POST /projects/:projectId/flags rejected: parent flag not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      if (parentFlag.projectId !== parsedParams.data.projectId) {
        request.log.warn(
          { parentFlagId: parsedBody.data.parentFlagId, parentProjectId: parentFlag.projectId, projectId: parsedParams.data.projectId },
          'POST /projects/:projectId/flags rejected: parent flag belongs to a different project',
        );
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }
    }

    try {
      const flag = await prisma.$transaction(async (tx) => {
        const created = await tx.featureFlag.create({
          data: {
            projectId: parsedParams.data.projectId,
            key: parsedBody.data.key,
            name: parsedBody.data.name,
            description: parsedBody.data.description,
            parentFlagId: parsedBody.data.parentFlagId,
          },
        });

        await tx.environment.updateMany({
          where: { projectId: parsedParams.data.projectId },
          data: { configVersion: { increment: 1 } },
        });

        return created;
      });

      return reply.code(StatusCodes.CREATED).send(flag);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        request.log.warn({ projectId: parsedParams.data.projectId, key: parsedBody.data.key }, 'POST /projects/:projectId/flags rejected: flag key already exists');
        return reply.conflict(ReasonPhrases.CONFLICT);
      }

      throw error;
    }
  });

  /**
   * PATCH /api/v1/flags/:flagId
   */
  fastify.patch(
    '/flags/:flagId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = flagParamsSchema.safeParse(request.params);
      const parsedBody = flagUpdateBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'PATCH /flags/:flagId rejected: invalid flagId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'PATCH /flags/:flagId rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      try {
        const flag = await prisma.$transaction(async (tx) => {
          const updated = await tx.featureFlag.update({
            where: { id: parsedParams.data.flagId },
            data: parsedBody.data,
          });

          await tx.environment.updateMany({
            where: { projectId: updated.projectId },
            data: { configVersion: { increment: 1 } },
          });

          return updated;
        });

        return flag;
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          request.log.warn({ flagId: parsedParams.data.flagId }, 'PATCH /flags/:flagId rejected: flag not found');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          request.log.warn({ flagId: parsedParams.data.flagId, key: parsedBody.data.key }, 'PATCH /flags/:flagId rejected: flag key already exists');
          return reply.conflict(ReasonPhrases.CONFLICT);
        }

        throw error;
      }
    },
  );

  /**
   * DELETE /api/v1/flags/:flagId
   */
  fastify.delete(
    '/flags/:flagId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = flagParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'DELETE /flags/:flagId rejected: invalid flagId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      try {
        await prisma.$transaction(async (tx) => {
          const flag = await tx.featureFlag.delete({
            where: { id: parsedParams.data.flagId },
          });

          await tx.environment.updateMany({
            where: { projectId: flag.projectId },
            data: { configVersion: { increment: 1 } },
          });
        });

        return reply.code(StatusCodes.NO_CONTENT).send();
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          request.log.warn({ flagId: parsedParams.data.flagId }, 'DELETE /flags/:flagId rejected: flag not found');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        throw error;
      }
    },
  );
}
