import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';

const PAGE_SIZE = 50;

const auditQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  flagId: z.string().uuid().optional(),
  envId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/**
 * Registers read-only audit log routes on the given Fastify instance.
 *
 * Routes:
 *   GET /audit
 *     Returns a paginated, newest-first list of AuditLog entries.
 *     All params are optional; omitting them returns the full log.
 *
 *     Query params:
 *       projectId  UUID — filter to a specific project
 *       flagId     UUID — filter to a specific feature flag
 *       envId      UUID — filter to a specific environment
 *       page       int ≥ 1 (default 1) — page number (50 entries per page)
 *
 *     Response: { total, page, pageSize, entries: AuditLog[] }
 */
export async function registerAuditRoutes(fastify: FastifyInstance) {
  fastify.get('/audit', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsed = auditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.badRequest('Invalid query parameters');
    }
    const { projectId, flagId, envId, page } = parsed.data;
    const skip = (page - 1) * PAGE_SIZE;

    const where = {
      ...(projectId ? { projectId } : {}),
      ...(flagId ? { flagId } : {}),
      ...(envId ? { envId } : {}),
    };

    const [total, entries] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
    ]);

    return { total, page, pageSize: PAGE_SIZE, entries };
  });
}
