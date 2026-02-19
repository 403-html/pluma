import type { FastifyInstance } from 'fastify';
import { prisma } from '@pluma/db';
import { sdkAuthHook } from '../../hooks/sdkAuth';

export async function registerSdkRoutes(fastify: FastifyInstance) {
  /**
   * GET /sdk/v1/snapshot
   * Returns the current feature flag snapshot for the authenticated project.
   */
  fastify.get('/snapshot', { preHandler: [sdkAuthHook] }, async (request) => {
    const projectId = request.sdkProjectId as string;

    const flags = await prisma.featureFlag.findMany({
      where: { projectId },
      select: { key: true },
      orderBy: { key: 'asc' },
    });

    return { projectId, flags };
  });
}
