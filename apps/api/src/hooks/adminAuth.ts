import type { FastifyRequest, FastifyReply } from 'fastify';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';

/**
 * Fastify preHandler hook for the Admin API (`/api/v1/*`).
 *
 * Use this hook on every route that human operators call through the UI or
 * direct API access using a browser session cookie.  Do **not** use it on SDK
 * routes — those must use `sdkAuthHook` instead.
 *
 * ## When to use
 * - Route is under `/api/v1/*`
 * - The caller is a human (browser, Postman, CLI acting on behalf of an admin)
 * - Authentication is via the `pluma_session` HTTP-only cookie set at login
 *
 * ## What it rejects (→ 401)
 * - Missing `pluma_session` cookie
 * - Session not found in the database
 * - Session that has expired (`expiresAt` is in the past)
 *
 * ## What it populates on success
 * - `request.sessionUserId` — the authenticated user's ID
 * - `request.sessionUser`   — `{ id, email, createdAt }` (no password hash)
 */
export async function adminAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const sessionToken = request.cookies['pluma_session'];

  if (!sessionToken) {
    request.log.warn('Admin auth rejected: missing session cookie');
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session) {
    request.log.warn('Admin auth rejected: session not found');
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  if (session.expiresAt < new Date()) {
    request.log.warn({ userId: session.userId, expiredAt: session.expiresAt }, 'Admin auth rejected: session expired');
    return reply.code(StatusCodes.UNAUTHORIZED).send({ error: ReasonPhrases.UNAUTHORIZED });
  }

  request.sessionUserId = session.user.id;
  request.sessionUser = { id: session.user.id, email: session.user.email, createdAt: session.user.createdAt };
}
