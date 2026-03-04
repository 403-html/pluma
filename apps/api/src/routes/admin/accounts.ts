import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma-flags/db';
import { USER_ROLES, UserRoles, AuditActions, AuditEntityTypes, AuditActorTypes } from '@pluma-flags/types';
import { adminAuthHook } from '../../hooks/adminAuth';
import { writeAuditLog } from '../../lib/audit';

// Roles that can be assigned via PATCH; 'operator' is only set during first registration.
const ASSIGNABLE_ROLES = USER_ROLES.filter((r) => r !== 'operator') as ['admin', 'user'];

const PAGE_SIZE = 50;
const MAX_PAGE = 1000;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
});

const patchAccountBodySchema = z.object({
  disabled: z.boolean().optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
});

export async function registerAccountRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/accounts
   * Lists all users with pagination. Accessible only by operator or admin role.
   * Query params:
   *   page  int ≥ 1 (default 1) — page number (50 entries per page)
   * Returns: { total, page, pageSize, accounts: { id, email, role, disabled, createdAt }[] }
   */
  fastify.get('/accounts', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const actor = request.sessionUser!;

    if (actor.role === UserRoles.USER) {
      request.log.warn({ actorId: actor.id }, 'Accounts list rejected: insufficient role');
      return reply.code(StatusCodes.FORBIDDEN).send({ error: ReasonPhrases.FORBIDDEN });
    }

    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      request.log.warn({ query: request.query }, 'GET /accounts rejected: invalid query parameters');
      return reply.badRequest('Invalid query parameters');
    }

    const { page } = parsed.data;
    const skip = (page - 1) * PAGE_SIZE;

    const [total, accounts] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        select: { id: true, email: true, role: true, disabled: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        skip,
        take: PAGE_SIZE,
      }),
    ]);

    return reply.code(StatusCodes.OK).send({ total, page, pageSize: PAGE_SIZE, accounts });
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

    if (actor.role === UserRoles.USER) {
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

    if (disabled !== undefined && target.role === UserRoles.OPERATOR) {
      request.log.warn({ actorId: actor.id, targetId: id }, 'Account patch rejected: cannot disable operator account');
      return reply.code(StatusCodes.FORBIDDEN).send({ error: 'Cannot disable an operator account' });
    }

    if (role !== undefined) {
      if (actor.id === id) {
        request.log.warn({ actorId: actor.id }, 'Account patch rejected: cannot change own role');
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'Cannot change your own role' });
      }
      if (target.role === UserRoles.OPERATOR) {
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

    try {
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      if (disabled !== undefined) { before.disabled = target.disabled; after.disabled = disabled; }
      if (role !== undefined) { before.role = target.role; after.role = role; }
      await writeAuditLog({
        action: AuditActions.UPDATE,
        entityType: AuditEntityTypes.ACCOUNT,
        entityId: updated.id,
        entityKey: updated.email,
        actorId: actor.id,
        actorEmail: actor.email,
        details: { before, after },
        meta: {
          ip: request.ip,
          ua: request.headers['user-agent'] as string | undefined,
          requestId: request.id,
          actorType: AuditActorTypes.USER,
        },
      });
    } catch (auditError) {
      request.log.error({ err: auditError, targetId: id }, 'PATCH /accounts/:id: failed to write audit log');
    }

    request.log.info({ actorId: actor.id, targetId: id }, 'Account updated');

    return reply.code(StatusCodes.OK).send(updated);
  });
}
