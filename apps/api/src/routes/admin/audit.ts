import { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pluma-flags/db';
import type { Prisma } from '@pluma-flags/db';
import { adminAuthHook } from '../../hooks/adminAuth';

const PAGE_SIZE = 50;
const EXPORT_BATCH_SIZE = 500;

const auditQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  flagId: z.string().uuid().optional(),
  envId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const auditExportQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  flagId: z.string().uuid().optional(),
  envId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Audit logs are retained indefinitely.
// Operators should schedule periodic archival of old entries.

const CSV_HEADER = 'timestamp,actorEmail,actorType,action,entityType,entityKey,projectKey,envKey,flagKey,ipAddress,requestId,details';

function csvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

type AuditLogRow = Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number];

function auditRowToCsvLine(entry: AuditLogRow): string {
  return [
    entry.createdAt.toISOString(),
    entry.actorEmail,
    entry.actorType,
    entry.action,
    entry.entityType,
    entry.entityKey,
    entry.projectKey,
    entry.envKey,
    entry.flagKey,
    entry.ipAddress,
    entry.requestId,
    entry.details != null ? JSON.stringify(entry.details) : null,
  ].map(csvCell).join(',');
}

async function* streamAuditCsvRows(
  where: Prisma.AuditLogWhereInput,
  log: FastifyInstance['log'],
): AsyncGenerator<string> {
  yield CSV_HEADER + '\n';
  let cursor: string | undefined;
  try {
    while (true) {
      const batch = await prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: EXPORT_BATCH_SIZE,
        ...(cursor !== undefined ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      for (const entry of batch) {
        yield auditRowToCsvLine(entry) + '\n';
      }
      if (batch.length < EXPORT_BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }
  } catch (err) {
    log.error({ err }, 'streamAuditCsvRows: database error during export, stream may be truncated');
    throw err;
  }
}

function buildCreatedAtFilter(from?: string, to?: string): Record<string, unknown> {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  };
}

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
 *
 *   GET /audit/export
 *     Streams all matching AuditLog entries as a CSV download (text/csv) in newest-first order.
 *     Records are fetched from the database in batches of 500 using cursor pagination so that
 *     the full result set is never materialised in memory at once.  Operators should use the
 *     from/to date filters to scope large exports.
 *
 *     Query params:
 *       projectId  UUID — filter to a specific project
 *       flagId     UUID — filter to a specific feature flag
 *       envId      UUID — filter to a specific environment
 *       from       ISO 8601 datetime — lower bound on createdAt
 *       to         ISO 8601 datetime — upper bound on createdAt
 *
 *     Response: text/csv stream — header row + one data row per matching entry, newest-first
 */
export async function registerAuditRoutes(fastify: FastifyInstance) {
  fastify.get('/audit', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsed = auditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      request.log.warn({ query: request.query }, 'GET /audit rejected: invalid query parameters');
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

  fastify.get('/audit/export', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsed = auditExportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      request.log.warn({ query: request.query }, 'GET /audit/export rejected: invalid query parameters');
      return reply.badRequest('Invalid query parameters');
    }
    const { projectId, flagId, envId, from, to } = parsed.data;

    const where: Prisma.AuditLogWhereInput = {
      ...(projectId ? { projectId } : {}),
      ...(flagId ? { flagId } : {}),
      ...(envId ? { envId } : {}),
      ...buildCreatedAtFilter(from, to),
    };

    const today = new Date().toISOString().slice(0, 10); // UTC date for filename
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="audit-${today}.csv"`)
      .send(Readable.from(streamAuditCsvRows(where, request.log)));
  });
}
