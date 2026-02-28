import type { FastifyInstance } from 'fastify';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';

/** Milliseconds in one day. */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Number of days shown in the chart window. */
export const CHART_DAYS = 7;

/** Character length of an ISO UTC date string (YYYY-MM-DD). */
export const ISO_DATE_LENGTH = 10;

/** Rollout percentage that represents a fully-rolled-out flag. */
export const ROLLOUT_FULL_PERCENT = 100;

/** Safety cap on rows fetched for daily-change grouping. */
export const MAX_AUDIT_LOGS = 10_000;

/**
 * Builds an array of CHART_DAYS consecutive UTC date strings (YYYY-MM-DD) ending today.
 */
function buildChartDays(): string[] {
  const days: string[] = [];
  for (let daysAgo = CHART_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const d = new Date(Date.now() - daysAgo * MS_PER_DAY);
    days.push(d.toISOString().slice(0, ISO_DATE_LENGTH));
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
    const day = createdAt.toISOString().slice(0, ISO_DATE_LENGTH);
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
    const since7Days = new Date(Date.now() - (CHART_DAYS - 1) * MS_PER_DAY);
    const since24h   = new Date(Date.now() - MS_PER_DAY);

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
        where: { rolloutPercentage: { not: null, lt: ROLLOUT_FULL_PERCENT } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: since24h } },
      }),
      prisma.auditLog.findMany({
        where:   { createdAt: { gte: since7Days } },
        select:  { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take:    MAX_AUDIT_LOGS,
      }),
    ]);

    // Group by UTC date using extracted helper (caps at MAX_AUDIT_LOGS for safety)
    const countsByDate = groupAuditLogsByDay(recentLogs);

    const dailyChanges = buildChartDays().map((date) => ({
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
