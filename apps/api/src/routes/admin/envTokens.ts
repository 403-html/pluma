import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';
import { writeAuditLog } from '../../lib/audit';

const TOKEN_BYTES = 32;
const TOKEN_PREFIX = 'pluma_sdk_';

const tokenBodySchema = z.object({
  name: z.string().min(1).max(100),
});

const envParamsSchema = z.object({
  envId: z.uuid(),
});

const tokenParamsSchema = z.object({
  id: z.uuid(),
});

export async function registerEnvTokenRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/environments/:envId/sdk-tokens
   * Lists all active (non-revoked) SDK tokens for an environment.
   */
  fastify.get(
    '/environments/:envId/sdk-tokens',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = envParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'GET /environments/:envId/sdk-tokens rejected: invalid envId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const environment = await prisma.environment.findUnique({
        where: { id: parsedParams.data.envId },
      });

      if (!environment) {
        request.log.warn({ envId: parsedParams.data.envId }, 'GET /environments/:envId/sdk-tokens rejected: environment not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      const tokens = await prisma.sdkToken.findMany({
        where: { envId: parsedParams.data.envId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, envId: true, projectId: true, name: true, createdAt: true },
      });

      return tokens;
    },
  );

  /**
   * POST /api/v1/environments/:envId/sdk-tokens
   * Creates a new env-scoped SDK token. Returns the raw token once.
   */
  fastify.post(
    '/environments/:envId/sdk-tokens',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = envParamsSchema.safeParse(request.params);
      const parsedBody = tokenBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'POST /environments/:envId/sdk-tokens rejected: invalid envId');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /environments/:envId/sdk-tokens rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const environment = await prisma.environment.findUnique({
        where: { id: parsedParams.data.envId },
      });

      if (!environment) {
        request.log.warn({ envId: parsedParams.data.envId }, 'POST /environments/:envId/sdk-tokens rejected: environment not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      const rawToken = TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const tokenPrefix = rawToken.slice(0, 12);

      const sdkToken = await prisma.sdkToken.create({
        data: {
          projectId: environment.projectId,
          envId: parsedParams.data.envId,
          name: parsedBody.data.name,
          tokenHash,
          tokenPrefix,
        },
        select: { id: true, envId: true, projectId: true, name: true, createdAt: true },
      });

      try {
        await writeAuditLog({
          action: 'create',
          entityType: 'token',
          entityId: sdkToken.id,
          projectId: sdkToken.projectId,
          envId: sdkToken.envId ?? undefined,
          actorId: request.sessionUserId!,
          actorEmail: request.sessionUser!.email,
          details: { name: sdkToken.name },
        });
      } catch (auditError) {
        request.log.error({ err: auditError, tokenId: sdkToken.id }, 'POST /environments/:envId/sdk-tokens: failed to write audit log');
      }

      return reply.code(StatusCodes.CREATED).send({ ...sdkToken, token: rawToken });
    },
  );

  /**
   * DELETE /api/v1/sdk-tokens/:id
   * Revokes an SDK token by id (immediate revocation).
   */
  fastify.delete(
    '/sdk-tokens/:id',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = tokenParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'DELETE /sdk-tokens/:id rejected: invalid id');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      try {
        await prisma.sdkToken.update({
          where: { id: parsedParams.data.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        try {
          await writeAuditLog({
            action: 'delete',
            entityType: 'token',
            entityId: parsedParams.data.id,
            actorId: request.sessionUserId!,
            actorEmail: request.sessionUser!.email,
          });
        } catch (auditError) {
          request.log.error({ err: auditError, tokenId: parsedParams.data.id }, 'DELETE /sdk-tokens/:id: failed to write audit log');
        }

        return reply.code(StatusCodes.NO_CONTENT).send();
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          request.log.warn({ tokenId: parsedParams.data.id }, 'DELETE /sdk-tokens/:id rejected: token not found or already revoked');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        throw error;
      }
    },
  );
}
