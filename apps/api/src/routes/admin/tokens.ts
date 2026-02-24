import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';
import { writeAuditLog } from '../../lib/audit';
import { TOKEN_BYTES, TOKEN_PREFIX, TOKEN_PREFIX_LENGTH } from '../../lib/tokenConstants';

const tokenBodySchema = z.object({
  name: z.string().min(1).max(100),
});

const projectParamsSchema = z.object({
  id: z.uuid(),
});

const tokenParamsSchema = z.object({
  id: z.uuid(),
  tokenId: z.uuid(),
});

export async function registerTokenRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/projects/:id/tokens
   * Lists all SDK tokens for a project (excludes revoked).
   */
  fastify.get(
    '/projects/:id/tokens',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'GET /projects/:id/tokens rejected: invalid id');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const project = await prisma.project.findUnique({
        where: { id: parsedParams.data.id },
      });

      if (!project) {
        request.log.warn({ projectId: parsedParams.data.id }, 'GET /projects/:id/tokens rejected: project not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      const tokens = await prisma.sdkToken.findMany({
        where: { projectId: parsedParams.data.id, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, projectId: true, name: true, createdAt: true, revokedAt: true },
      });

      return tokens;
    },
  );

  /**
   * POST /api/v1/projects/:id/tokens
   * Creates a new SDK token for a project. Returns the raw token once.
   */
  fastify.post(
    '/projects/:id/tokens',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);
      const parsedBody = tokenBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'POST /projects/:id/tokens rejected: invalid id');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /projects/:id/tokens rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const project = await prisma.project.findUnique({
        where: { id: parsedParams.data.id },
      });

      if (!project) {
        request.log.warn({ projectId: parsedParams.data.id }, 'POST /projects/:id/tokens rejected: project not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      const rawToken = TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const tokenPrefix = rawToken.slice(0, TOKEN_PREFIX_LENGTH);

      const sdkToken = await prisma.sdkToken.create({
        data: {
          projectId: parsedParams.data.id,
          name: parsedBody.data.name,
          tokenHash,
          tokenPrefix,
        },
        select: { id: true, projectId: true, name: true, createdAt: true, revokedAt: true },
      });

      try {
        await writeAuditLog({
          action: 'create',
          entityType: 'token',
          entityId: sdkToken.id,
          projectId: sdkToken.projectId,
          actorId: request.sessionUserId!,
          actorEmail: request.sessionUser!.email,
          details: { name: sdkToken.name },
        });
      } catch (auditError) {
        request.log.error({ err: auditError, tokenId: sdkToken.id }, 'POST /projects/:id/tokens: failed to write audit log');
      }

      return reply.code(StatusCodes.CREATED).send({ ...sdkToken, token: rawToken });
    },
  );

  /**
   * DELETE /api/v1/projects/:id/tokens/:tokenId
   * Revokes a SDK token (sets revokedAt).
   */
  fastify.delete(
    '/projects/:id/tokens/:tokenId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = tokenParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'DELETE /projects/:id/tokens/:tokenId rejected: invalid params');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      try {
        await prisma.sdkToken.update({
          where: {
            id: parsedParams.data.tokenId,
            projectId: parsedParams.data.id,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });

        try {
          await writeAuditLog({
            action: 'delete',
            entityType: 'token',
            entityId: parsedParams.data.tokenId,
            projectId: parsedParams.data.id,
            actorId: request.sessionUserId!,
            actorEmail: request.sessionUser!.email,
          });
        } catch (auditError) {
          request.log.error({ err: auditError, tokenId: parsedParams.data.tokenId }, 'DELETE /projects/:id/tokens/:tokenId: failed to write audit log');
        }

        return reply.code(StatusCodes.NO_CONTENT).send();
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          request.log.warn({ tokenId: parsedParams.data.tokenId, projectId: parsedParams.data.id }, 'DELETE /projects/:id/tokens/:tokenId rejected: token not found or already revoked');
          return reply.notFound(ReasonPhrases.NOT_FOUND);
        }

        throw error;
      }
    },
  );
}
