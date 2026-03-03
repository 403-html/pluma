import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma-flags/db';
import { adminAuthHook } from '../../hooks/adminAuth';

// Only admin and user can be assigned via PATCH; operator is set only on first registration.
const ASSIGNABLE_ROLES = ['admin', 'user'] as const;

const patchAccountBodySchema = z.object({
  disabled: z.boolean().optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
});

export async function registerAccountRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/accounts
   * Lists all users. Accessible only by operator or admin role.
   * Returns: { id, email, role, disabled, createdAt }[]
   */
  fastify.get('/accounts', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const actor = request.sessionUser!;

    if (actor.role === 'user') {
      request.log.warn({ actorId: actor.id }, 'Accounts list rejected: insufficient role');
      return reply.code(StatusCodes.FORBIDDEN).send({ error: ReasonPhrases.FORBIDDEN });
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, disabled: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return reply.code(StatusCodes.OK).send(users);
  });

  /**
   * PATCH /api/v1/accounts/:id
   * Updates a user's `disabled` flag and/or `role`.
   * Constraints:
   *   - Operator or admin only (403 for user role)
   *   - Cannot change own role
   *   - Cannot change an operator's role
   *   - Cannot promote anyone to "operator"
   * Returns the updated user: { id, email, role, disabled, createdAt }
   */
  fastify.patch('/accounts/:id', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const actor = request.sessionUser!;

    if (actor.role === 'user') {
      request.log.warn({ actorId: actor.id }, 'Account patch rejected: insufficient role');
      return reply.code(StatusCodes.FORBIDDEN).send({ error: ReasonPhrases.FORBIDDEN });
    }

    const { id } = request.params as { id: string };

    const parsedBody = patchAccountBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'Account patch rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const { disabled, role } = parsedBody.data;

    if (disabled === undefined && role === undefined) {
      return reply.badRequest('At least one of "disabled" or "role" must be provided');
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return reply.code(StatusCodes.NOT_FOUND).send({ error: ReasonPhrases.NOT_FOUND });
    }

    if (role !== undefined) {
      if (actor.id === id) {
        request.log.warn({ actorId: actor.id }, 'Account patch rejected: cannot change own role');
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'Cannot change your own role' });
      }
      if (target.role === 'operator') {
        request.log.warn({ actorId: actor.id, targetId: id }, 'Account patch rejected: cannot change operator role');
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'Cannot change the role of an operator' });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(disabled !== undefined && { disabled }),
        ...(role !== undefined && { role }),
      },
      select: { id: true, email: true, role: true, disabled: true, createdAt: true },
    });

    request.log.info({ actorId: actor.id, targetId: id }, 'Account updated');

    return reply.code(StatusCodes.OK).send(updated);
  });
}
