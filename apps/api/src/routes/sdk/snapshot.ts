import type { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { sdkAuthHook } from '../../hooks/sdkAuth';

export async function registerSdkRoutes(fastify: FastifyInstance) {
  /**
   * GET /sdk/v1/snapshot
   * Returns the current feature flag snapshot for the authenticated environment.
   * Supports ETag / If-None-Match for cheap 304 Not Modified responses.
   */
  fastify.get('/snapshot', {
    schema: {
      tags: ['SDK'],
      summary: 'Get flag snapshot',
      description: 'Returns the current feature flag snapshot for the authenticated environment. Supports ETag / If-None-Match for cheap 304 Not Modified responses.',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [sdkAuthHook],
  }, async (request, reply) => {
    const envId = request.sdkEnvId;
    const projectId = request.sdkProjectId as string;

    if (!envId) {
      // Project-scoped tokens cannot access the snapshot endpoint.
      return reply.code(StatusCodes.UNAUTHORIZED).send({ error: 'Unauthorized' });
    }

    const environment = await prisma.environment.findUnique({
      where: { id: envId },
      include: { project: true },
    });

    if (!environment || environment.projectId !== projectId) {
      return reply.code(StatusCodes.UNAUTHORIZED).send({ error: 'Unauthorized' });
    }

    const etag = String(environment.configVersion);
    const ifNoneMatch = request.headers['if-none-match'];

    if (ifNoneMatch === etag) {
      return reply.code(StatusCodes.NOT_MODIFIED).send();
    }

    const flags = await prisma.featureFlag.findMany({
      where: { projectId },
      orderBy: { key: 'asc' },
    });

    const flagIds = flags.map((f) => f.id);

    const configs = await prisma.flagConfig.findMany({
      where: { envId, flagId: { in: flagIds } },
    });

    // Build maps for O(1) lookups
    const configMap = new Map(configs.map((c) => [c.flagId, c]));
    const keyMap = new Map(flags.map((f) => [f.id, f.key]));

    const snapshotFlags = flags.map((flag) => {
      const config = configMap.get(flag.id);
      // Resolve parent key; if parentFlagId is set but the parent is no longer in this
      // project's flag set (e.g. deleted), treat as no parent to keep the snapshot consistent.
      const resolvedParentKey = flag.parentFlagId ? (keyMap.get(flag.parentFlagId) ?? null) : null;
      return {
        key: flag.key,
        parentKey: resolvedParentKey,
        enabled: config?.enabled ?? false,
        inheritParent: resolvedParentKey !== null,
        allowList: config?.allowList ?? [],
        denyList: config?.denyList ?? [],
      };
    });

    void reply.header('ETag', etag);

    return {
      version: environment.configVersion,
      projectKey: environment.project.key,
      envKey: environment.key,
      flags: snapshotFlags,
    };
  });
}
