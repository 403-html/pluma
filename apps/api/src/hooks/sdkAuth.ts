import type { FastifyRequest, FastifyReply } from 'fastify';
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
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const rawToken = authHeader.slice(7);

  if (!rawToken) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const sdkToken = await prisma.sdkToken.findUnique({
    where: { tokenHash },
  });

  if (!sdkToken || sdkToken.revokedAt !== null) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  request.sdkProjectId = sdkToken.projectId;
}
