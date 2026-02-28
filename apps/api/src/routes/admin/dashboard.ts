import type { FastifyInstance } from 'fastify';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';

/** Safety cap on rows fetched for daily-change grouping. */
const MAX_AUDIT_LOGS = 10_000;

/**
 * Builds an array of 7 consecutive UTC date strings (YYYY-MM-DD) ending today.
 */
function buildLast7Days(): string[] {
  const days: string[] = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Groups an array of { createdAt } records by UTC date string (YYYY-MM-DD).
 */
function groupAuditLogsByDay(logs: Array<{ createdAt: Date }>): Map<string, number> {
  if (logs.length > MAX_AUDIT_LOGS) {
    throw new Error(`Unexpectedly large audit log result: ${logs.length} rows (max ${MAX_AUDIT_LOGS})`);
  }
  const counts = new Map<string, number>();
  for (const { createdAt } of logs) {
    const day = createdAt.toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/**
 * Registers dashboard summary routes on the given Fastify instance.
 *
 * Routes:
 *   GET /dashboard
 *     Returns aggregate counts for the admin dashboard.
 *
 *     Response: {
 *       projects, environments, activeFlags, targetedFlags,
 *       rollingOutFlags, recentChanges,
 *       dailyChanges: Array<{ date: string; count: number }>
 *     }
 */
export async function registerDashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: [adminAuthHook] }, async (_request, _reply) => {
    const since7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since24h   = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      projects,
      environments,
      activeFlags,
      targetedFlags,
      rollingOutFlags,
      recentChanges,
      recentLogs,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.environment.count(),
      prisma.flagConfig.count({ where: { enabled: true } }),
      prisma.flagConfig.count({
        where: {
          OR: [
            { allowList: { isEmpty: false } },
            { denyList:  { isEmpty: false } },
          ],
        },
      }),
      prisma.flagConfig.count({
        where: { rolloutPercentage: { not: null, lt: 100 } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: since24h } },
      }),
      prisma.auditLog.findMany({
        where:  { createdAt: { gte: since7Days } },
        select: { createdAt: true },
        take:   MAX_AUDIT_LOGS,
      }),
    ]);

    // Group by UTC date using extracted helper (caps at MAX_AUDIT_LOGS for safety)
    const countsByDate = groupAuditLogsByDay(recentLogs);

    const dailyChanges = buildLast7Days().map((date) => ({
      date,
      count: countsByDate.get(date) ?? 0,
    }));

    return {
      projects,
      environments,
      activeFlags,
      targetedFlags,
      rollingOutFlags,
      recentChanges,
      dailyChanges,
    };
  });
}
