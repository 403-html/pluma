import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '@pluma/db';

/**
 * Fastify preHandler hook that validates the admin session cookie.
 * Attaches the authenticated user id to `request.sessionUserId`.
 */
export async function adminAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const sessionToken = request.cookies['pluma_session'];

  if (!sessionToken) {
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: 'Unauthorized' });
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session) {
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: 'Unauthorized' });
  }

  if (session.expiresAt < new Date()) {
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: 'Session expired' });
  }

  request.sessionUserId = session.user.id;
  request.sessionUser = { id: session.user.id, email: session.user.email, createdAt: session.user.createdAt };
}
