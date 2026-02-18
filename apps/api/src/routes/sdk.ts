import type { FastifyInstance } from 'fastify';
import { prisma } from '@pluma/db';

export async function registerSdkRoutes(fastify: FastifyInstance) {
  fastify.get('/snapshot', async (request, reply) => {
    if (!request.sdk) {
      return reply.unauthorized('SDK token required');
    }

    // Snapshot is derived solely from the token's environment; client params are ignored.
    const flags = await prisma.flag.findMany({
      where: { projectId: request.sdk.projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        configurations: {
          where: { environmentId: request.sdk.environmentId },
        },
      },
    });

    const snapshot = flags.reduce<Record<string, { enabled: boolean; value: unknown | null }>>(
      (accumulator, flag) => {
        const configuration = flag.configurations[0];
        accumulator[flag.key] = {
          enabled: configuration?.enabled ?? false,
          value: configuration?.value ?? null,
        };
        return accumulator;
      },
      {},
    );

    return {
      environmentId: request.sdk.environmentId,
      flags: snapshot,
    };
  });
}
