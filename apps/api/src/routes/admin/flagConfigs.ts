import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';

const PAGE_SIZE = 100;

const envParamsSchema = z.object({
  envId: z.uuid(),
});

const flagsQuerySchema = z.object({
  cursor: z.uuid().optional(),
});

const flagConfigParamsSchema = z.object({
  envId: z.uuid(),
  flagId: z.uuid(),
});

const flagConfigUpdateBodySchema = z.object({
  enabled: z.boolean().optional(),
  allowList: z.array(z.string().min(1)).optional(),
  denyList: z.array(z.string().min(1)).optional(),
}).refine(
  (body) => body.enabled !== undefined || body.allowList !== undefined || body.denyList !== undefined,
  { message: 'At least one of enabled, allowList, or denyList must be provided' },
).refine(
  (body) => {
    if (body.allowList === undefined) return true;
    return new Set(body.allowList).size === body.allowList.length;
  },
  { message: 'allowList must not contain duplicate entries', path: ['allowList'] },
).refine(
  (body) => {
    if (body.denyList === undefined) return true;
    return new Set(body.denyList).size === body.denyList.length;
  },
  { message: 'denyList must not contain duplicate entries', path: ['denyList'] },
).refine(
  (body) => {
    if (body.allowList === undefined || body.denyList === undefined) return true;
    const allowSet = new Set(body.allowList);
    return !body.denyList.some((s) => allowSet.has(s));
  },
  { message: 'A subject key must not appear in both allowList and denyList', path: ['allowList'] },
);

/**
 * Validates that the environment and flag exist and belong to the same project.
 * Returns the ids on success, or replies with an error and returns null.
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
   * Returns a paginated list of flags for the project with their enabled state in
   * this environment. Supports cursor-based pagination via the `cursor` query param
   * (pass the `nextCursor` from the previous response to fetch the next page).
   *
   * Response: { data: FlagConfigEntry[], nextCursor: string | null }
   */
  fastify.get(
    '/environments/:envId/flags',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = envParamsSchema.safeParse(request.params);
      const parsedQuery = flagsQuerySchema.safeParse(request.query);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'GET /environments/:envId/flags rejected: invalid envId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedQuery.success) {
        request.log.warn({ query: request.query }, 'GET /environments/:envId/flags rejected: invalid query');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const environment = await prisma.environment.findUnique({
        where: { id: parsedParams.data.envId },
      });

      if (!environment) {
        request.log.warn({ envId: parsedParams.data.envId }, 'GET /environments/:envId/flags rejected: environment not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      const cursor = parsedQuery.data.cursor;

      const flags = await prisma.featureFlag.findMany({
        where: { projectId: environment.projectId },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasNextPage = flags.length > PAGE_SIZE;
      const page = hasNextPage ? flags.slice(0, PAGE_SIZE) : flags;
      const nextCursor = hasNextPage ? (page[page.length - 1]?.id ?? null) : null;

      const flagIds = page.map((f) => f.id);

      const configs = await prisma.flagConfig.findMany({
        where: { envId: parsedParams.data.envId, flagId: { in: flagIds } },
      });

      const configMap = new Map(configs.map((c) => [c.flagId, c.enabled]));

      return {
        data: page.map((flag) => ({
          flagId: flag.id,
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled: configMap.get(flag.id) ?? false,
        })),
        nextCursor,
      };
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

      const config = await prisma.$transaction(async (tx) => {
        const upserted = await tx.flagConfig.upsert({
          where: { envId_flagId: { envId: validated.envId, flagId: validated.flagId } },
          update: {
            ...(parsedBody.data.enabled !== undefined && { enabled: parsedBody.data.enabled }),
            ...(parsedBody.data.allowList !== undefined && { allowList: parsedBody.data.allowList }),
            ...(parsedBody.data.denyList !== undefined && { denyList: parsedBody.data.denyList }),
          },
          create: {
            envId: validated.envId,
            flagId: validated.flagId,
            enabled: parsedBody.data.enabled ?? false,
            allowList: parsedBody.data.allowList ?? [],
            denyList: parsedBody.data.denyList ?? [],
          },
        });

        await tx.environment.update({
          where: { id: validated.envId },
          data: { configVersion: { increment: 1 } },
        });

        return upserted;
      });

      return config;
    },
  );
}
