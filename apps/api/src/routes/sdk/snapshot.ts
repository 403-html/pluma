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
  fastify.get('/snapshot', { preHandler: [sdkAuthHook] }, async (request, reply) => {
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

    const configMap = new Map(configs.map((c) => [c.flagId, c.enabled]));

    const snapshotFlags = flags.map((flag) => ({
      key: flag.key,
      parentKey: null,
      enabled: configMap.get(flag.id) ?? false,
      inheritParent: false,
    }));

    void reply.header('ETag', etag);

    return {
      version: environment.configVersion,
      projectKey: environment.project.key,
      envKey: environment.key,
      flags: snapshotFlags,
    };
  });
}
