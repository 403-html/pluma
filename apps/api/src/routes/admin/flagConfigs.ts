import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';

const MAX_FLAGS_PER_PROJECT = 1000;

const envParamsSchema = z.object({
  envId: z.uuid(),
});

const flagConfigParamsSchema = z.object({
  envId: z.uuid(),
  flagId: z.uuid(),
});

const flagConfigUpdateBodySchema = z.object({
  enabled: z.boolean(),
});

/**
 * Validates that the environment and flag exist and belong to the same project.
 * Returns the flag on success, or replies with an error and returns null.
 */
async function validateFlagEnvironmentMatch(
  envId: string,
  flagId: string,
  reply: FastifyReply,
): Promise<{ envId: string; flagId: string } | null> {
  const environment = await prisma.environment.findUnique({
    where: { id: envId },
  });

  if (!environment) {
    reply.log.warn({ envId }, 'PATCH /environments/:envId/flags/:flagId rejected: environment not found');
    await reply.notFound(ReasonPhrases.NOT_FOUND);
    return null;
  }

  const flag = await prisma.featureFlag.findUnique({
    where: { id: flagId },
  });

  if (!flag) {
    reply.log.warn({ flagId }, 'PATCH /environments/:envId/flags/:flagId rejected: flag not found');
    await reply.notFound(ReasonPhrases.NOT_FOUND);
    return null;
  }

  if (flag.projectId !== environment.projectId) {
    reply.log.warn(
      { flagId, flagProjectId: flag.projectId, envProjectId: environment.projectId },
      'PATCH /environments/:envId/flags/:flagId rejected: flag and environment belong to different projects',
    );
    await reply.badRequest(ReasonPhrases.BAD_REQUEST);
    return null;
  }

  return { envId, flagId };
}

export async function registerFlagConfigRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/environments/:envId/flags
   * Returns all flags for the project with their enabled state in this environment.
   */
  fastify.get(
    '/environments/:envId/flags',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = envParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'GET /environments/:envId/flags rejected: invalid envId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const environment = await prisma.environment.findUnique({
        where: { id: parsedParams.data.envId },
      });

      if (!environment) {
        request.log.warn({ envId: parsedParams.data.envId }, 'GET /environments/:envId/flags rejected: environment not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      const flags = await prisma.featureFlag.findMany({
        where: { projectId: environment.projectId },
        orderBy: { createdAt: 'desc' },
        take: MAX_FLAGS_PER_PROJECT,
      });

      const configs = await prisma.flagConfig.findMany({
        where: { envId: parsedParams.data.envId },
        take: MAX_FLAGS_PER_PROJECT,
      });

      const configMap = new Map(configs.map((c) => [c.flagId, c.enabled]));

      return flags.map((flag) => ({
        flagId: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: configMap.get(flag.id) ?? false,
      }));
    },
  );

  /**
   * PATCH /api/v1/environments/:envId/flags/:flagId
   * Toggle a flag in an environment (lazy-creates config row).
   */
  fastify.patch(
    '/environments/:envId/flags/:flagId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = flagConfigParamsSchema.safeParse(request.params);
      const parsedBody = flagConfigUpdateBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'PATCH /environments/:envId/flags/:flagId rejected: invalid params');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'PATCH /environments/:envId/flags/:flagId rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const validated = await validateFlagEnvironmentMatch(
        parsedParams.data.envId,
        parsedParams.data.flagId,
        reply,
      );

      if (!validated) {
        return;
      }

      const config = await prisma.flagConfig.upsert({
        where: { envId_flagId: { envId: validated.envId, flagId: validated.flagId } },
        update: { enabled: parsedBody.data.enabled },
        create: {
          envId: validated.envId,
          flagId: validated.flagId,
          enabled: parsedBody.data.enabled,
        },
      });

      return config;
    },
  );
}
