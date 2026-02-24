import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';
import { writeAuditLog } from '../../lib/audit';
import { TOKEN_BYTES, TOKEN_PREFIX, TOKEN_PREFIX_LENGTH } from '../../lib/tokenConstants';

const orgTokenBodySchema = z.object({
  projectId: z.uuid(),
  envId: z.uuid().optional(),
  name: z.string().min(1).max(100),
});

const tokenParamsSchema = z.object({
  id: z.uuid(),
});

export async function registerOrgTokenRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/tokens
   * Lists all active (non-revoked) SDK tokens across the entire org.
   */
  fastify.get(
    '/tokens',
    { preHandler: [adminAuthHook] },
    async (_request, reply) => {
      const tokens = await prisma.sdkToken.findMany({
        where: { revokedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { project: true },
      });

      const result = tokens.map((t) => ({
        id: t.id,
        name: t.name,
        tokenPrefix: t.tokenPrefix,
        projectId: t.projectId,
        projectName: t.project.name,
        envId: t.envId,
        createdAt: t.createdAt,
      }));

      return reply.code(StatusCodes.OK).send(result);
    },
  );

  /**
   * POST /api/v1/tokens
   * Creates a new org-level SDK token. Returns the raw token once.
   */
  fastify.post(
    '/tokens',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedBody = orgTokenBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /tokens rejected: invalid payload');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const { projectId, envId, name } = parsedBody.data;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        request.log.warn({ projectId }, 'POST /tokens rejected: project not found');
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Project not found' });
      }

      if (envId) {
        const environment = await prisma.environment.findUnique({
          where: { id: envId },
        });

        if (!environment || environment.projectId !== projectId) {
          request.log.warn({ envId, projectId }, 'POST /tokens rejected: environment not found');
          return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Environment not found' });
        }
      }

      const rawToken = TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const tokenPrefix = rawToken.slice(0, TOKEN_PREFIX_LENGTH);

      const sdkToken = await prisma.sdkToken.create({
        data: {
          projectId,
          envId,
          name,
          tokenHash,
          tokenPrefix,
        },
        select: { id: true, name: true, tokenPrefix: true, projectId: true, envId: true, createdAt: true },
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
        request.log.error({ err: auditError, tokenId: sdkToken.id }, 'POST /tokens: failed to write audit log');
      }

      return reply.code(StatusCodes.CREATED).send({ ...sdkToken, token: rawToken });
    },
  );

  /**
   * DELETE /api/v1/tokens/:id
   * Revokes an SDK token by id.
   */
  fastify.delete(
    '/tokens/:id',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = tokenParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        request.log.warn({ params: request.params }, 'DELETE /tokens/:id rejected: invalid id');
        return reply.badRequest(ReasonPhrases.BAD_REQUEST);
      }

      const token = await prisma.sdkToken.findUnique({
        where: { id: parsedParams.data.id },
      });

      if (!token || token.revokedAt !== null) {
        request.log.warn({ tokenId: parsedParams.data.id }, 'DELETE /tokens/:id rejected: token not found or already revoked');
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Token not found' });
      }

      await prisma.sdkToken.update({
        where: { id: parsedParams.data.id },
        data: { revokedAt: new Date() },
      });

      try {
        await writeAuditLog({
          action: 'delete',
          entityType: 'token',
          entityId: parsedParams.data.id,
          projectId: token.projectId,
          actorId: request.sessionUserId!,
          actorEmail: request.sessionUser!.email,
        });
      } catch (auditError) {
        request.log.error({ err: auditError, tokenId: parsedParams.data.id }, 'DELETE /tokens/:id: failed to write audit log');
      }

      return reply.code(StatusCodes.OK).send({ message: 'Token revoked' });
    },
  );
}
