import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { createHash } from 'crypto';

/**
 * Fastify preHandler hook that validates the SDK Bearer token.
 * Attaches the resolved projectId to `request.sdkProjectId`.
 */
export async function sdkAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  const rawToken = authHeader.slice(7);

  if (!rawToken) {
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const sdkToken = await prisma.sdkToken.findUnique({
    where: { tokenHash },
  });

  if (!sdkToken || sdkToken.revokedAt !== null) {
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  request.sdkProjectId = sdkToken.projectId;
}
