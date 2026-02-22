import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';
import { writeAuditLog } from '../../lib/audit';

const envBodySchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
});

const envUpdateBodySchema = z
  .object({
    key: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(200).optional(),
  })
  .refine((body) => body.key !== undefined || body.name !== undefined, {
    message: 'At least one field is required',
  });

const projectParamsSchema = z.object({
  projectId: z.uuid(),
});

const envParamsSchema = z.object({
  envId: z.uuid(),
});

export async function registerEnvironmentRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/projects/:projectId/environments
   */
  fastify.get(
    '/projects/:projectId/environments',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'GET /projects/:projectId/environments rejected: invalid projectId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const project = await prisma.project.findUnique({
        where: { id: parsedParams.data.projectId },
      });

      if (!project) {
        request.log.warn({ projectId: parsedParams.data.projectId }, 'GET /projects/:projectId/environments rejected: project not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      const [environments, totalFlags] = await Promise.all([
        prisma.environment.findMany({
          where: { projectId: parsedParams.data.projectId },
          orderBy: { createdAt: 'asc' },
          include: {
            flagConfigs: { where: { enabled: true }, select: { flagId: true } },
          },
        }),
        prisma.featureFlag.count({
          where: { projectId: parsedParams.data.projectId },
        }),
      ]);

      return environments.map((env) => {
        const { flagConfigs, ...rest } = env;
        return {
          ...rest,
          flagStats: {
            total: totalFlags,
            enabled: flagConfigs.length,
          },
        };
      });
    },
  );

  /**
   * POST /api/v1/projects/:projectId/environments
   */
  fastify.post(
    '/projects/:projectId/environments',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);
      const parsedBody = envBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'POST /projects/:projectId/environments rejected: invalid projectId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /projects/:projectId/environments rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const project = await prisma.project.findUnique({
        where: { id: parsedParams.data.projectId },
      });

      if (!project) {
        request.log.warn({ projectId: parsedParams.data.projectId }, 'POST /projects/:projectId/environments rejected: project not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      try {
        const environment = await prisma.environment.create({
          data: {
            projectId: parsedParams.data.projectId,
            key: parsedBody.data.key,
            name: parsedBody.data.name,
          },
        });

        await writeAuditLog({
          action: 'create',
          entityType: 'environment',
          entityId: environment.id,
          entityKey: environment.key,
          projectId: environment.projectId,
          envId: environment.id,
          envKey: environment.key,
          actorId: request.sessionUserId!,
          actorEmail: request.sessionUser!.email,
        });

        return reply.code(StatusCodes.CREATED).send(environment);
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          request.log.warn({ projectId: parsedParams.data.projectId, key: parsedBody.data.key }, 'POST /projects/:projectId/environments rejected: env key already exists');
          return reply.conflict(ReasonPhrases.CONFLICT);
        }

        throw error;
      }
    },
  );

  /**
   * PATCH /api/v1/environments/:envId
   */
  fastify.patch(
    '/environments/:envId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = envParamsSchema.safeParse(request.params);
      const parsedBody = envUpdateBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'PATCH /environments/:envId rejected: invalid envId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'PATCH /environments/:envId rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      try {
        const environment = await prisma.environment.update({
          where: { id: parsedParams.data.envId },
          data: { ...parsedBody.data, configVersion: { increment: 1 } },
        });

        await writeAuditLog({
          action: 'update',
          entityType: 'environment',
          entityId: environment.id,
          entityKey: environment.key,
          projectId: environment.projectId,
          envId: environment.id,
          envKey: environment.key,
          actorId: request.sessionUserId!,
          actorEmail: request.sessionUser!.email,
          details: parsedBody.data,
        });

        return environment;
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          request.log.warn({ envId: parsedParams.data.envId }, 'PATCH /environments/:envId rejected: environment not found');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          request.log.warn({ envId: parsedParams.data.envId, key: parsedBody.data.key }, 'PATCH /environments/:envId rejected: env key already exists');
          return reply.conflict(ReasonPhrases.CONFLICT);
        }

        throw error;
      }
    },
  );

  /**
   * DELETE /api/v1/environments/:envId
   */
  fastify.delete(
    '/environments/:envId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = envParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'DELETE /environments/:envId rejected: invalid envId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      try {
        const environment = await prisma.environment.findUnique({
          where: { id: parsedParams.data.envId },
        });

        if (!environment) {
          request.log.warn({ envId: parsedParams.data.envId }, 'DELETE /environments/:envId rejected: environment not found');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        await prisma.environment.delete({
          where: { id: parsedParams.data.envId },
        });

        await writeAuditLog({
          action: 'delete',
          entityType: 'environment',
          entityId: environment.id,
          entityKey: environment.key,
          projectId: environment.projectId,
          envId: environment.id,
          envKey: environment.key,
          actorId: request.sessionUserId!,
          actorEmail: request.sessionUser!.email,
        });

        return reply.code(StatusCodes.NO_CONTENT).send();
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          request.log.warn({ envId: parsedParams.data.envId }, 'DELETE /environments/:envId rejected: environment not found');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        throw error;
      }
    },
  );
}
