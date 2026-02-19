import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { createHash } from 'crypto';

/**
 * Fastify preHandler hook that validates the SDK Bearer token.
 * Attaches the resolved projectId to `request.sdkProjectId`.
 * If the token is env-scoped, also attaches `request.sdkEnvId`.
 */
export async function sdkAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    request.log.warn('SDK auth rejected: missing or malformed Authorization header');
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  const rawToken = authHeader.slice(7);

  if (!rawToken) {
    request.log.warn('SDK auth rejected: empty Bearer token');
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const sdkToken = await prisma.sdkToken.findUnique({
    where: { tokenHash },
  });

  if (!sdkToken) {
    request.log.warn('SDK auth rejected: token not found');
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  if (sdkToken.revokedAt !== null) {
    request.log.warn({ tokenId: sdkToken.id, projectId: sdkToken.projectId, revokedAt: sdkToken.revokedAt }, 'SDK auth rejected: token revoked');
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  request.sdkProjectId = sdkToken.projectId;

  if (sdkToken.envId) {
    request.sdkEnvId = sdkToken.envId;
  }
}
