import type { FastifyInstance } from 'fastify';
import { prisma } from '@pluma-flags/db';
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

/** Number of days without activity before a rollout is considered stale. */
export const STALE_ROLLOUT_DAYS = 7;

/** Maximum number of stale rollouts returned in the dashboard response. */
export const MAX_STALE_ROLLOUTS = 50;

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

type RollingOutConfig = {
  flagId: string;
  envId: string;
  rolloutPercentage: number | null;
  flag: { id: string; key: string; name: string; project: { id: string; key: string; name: string } };
  environment: { id: string; key: string; name: string };
};

type RecentActivity = { flagId: string | null; envId: string | null };

function buildStaleRollouts(
  rollingOutConfigs: RollingOutConfig[],
  recentActivity: RecentActivity[],
) {
  const recentActivitySet = new Set(
    recentActivity
      .filter((a): a is { flagId: string; envId: string } => a.flagId != null && a.envId != null)
      .map((a) => `${a.flagId}:${a.envId}`),
  );
  return rollingOutConfigs
    .filter((c) => !recentActivitySet.has(`${c.flagId}:${c.envId}`))
    .slice(0, MAX_STALE_ROLLOUTS)
    .map((c) => ({
      flagId: c.flag.id,
      flagKey: c.flag.key,
      flagName: c.flag.name,
      envId: c.environment.id,
      envKey: c.environment.key,
      envName: c.environment.name,
      projectId: c.flag.project.id,
      projectKey: c.flag.project.key,
      projectName: c.flag.project.name,
      rolloutPercentage: c.rolloutPercentage as number,
    }));
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
    const since7Days      = new Date(Date.now() - (CHART_DAYS - 1) * MS_PER_DAY);
    const since24h        = new Date(Date.now() - MS_PER_DAY);
    const since7DaysStale = new Date(Date.now() - STALE_ROLLOUT_DAYS * MS_PER_DAY);

    const [
      projects,
      environments,
      activeFlags,
      targetedFlags,
      rollingOutFlags,
      recentChanges,
      recentLogs,
      rollingOutConfigs,
      recentFlagConfigActivity,
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
      prisma.flagConfig.findMany({
        where: { rolloutPercentage: { not: null, lt: ROLLOUT_FULL_PERCENT } },
        select: {
          flagId: true,
          envId: true,
          rolloutPercentage: true,
          flag: {
            select: {
              id: true,
              key: true,
              name: true,
              project: { select: { id: true, key: true, name: true } },
            },
          },
          environment: { select: { id: true, key: true, name: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: 'flagConfig',
          createdAt:  { gte: since7DaysStale },
          flagId:     { not: null },
          envId:      { not: null },
        },
        select: { flagId: true, envId: true },
      }),
    ]);

    const countsByDate = groupAuditLogsByDay(recentLogs);

    const dailyChanges = buildChartDays().map((date) => ({
      date,
      count: countsByDate.get(date) ?? 0,
    }));

    const staleRollouts = buildStaleRollouts(rollingOutConfigs, recentFlagConfigActivity);

    return {
      projects,
      environments,
      activeFlags,
      targetedFlags,
      rollingOutFlags,
      recentChanges,
      dailyChanges,
      staleRollouts,
    };
  });
}
