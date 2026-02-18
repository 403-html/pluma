import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma, prisma } from '@pluma/db';

const environmentParamsSchema = z.object({
  envId: z.uuid(),
});

const environmentFlagParamsSchema = z.object({
  envId: z.uuid(),
  flagId: z.uuid(),
});

const flagConfigBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    value: z.unknown().optional(),
  })
  .refine((body) => body.enabled !== undefined || body.value !== undefined, {
    message: 'At least one field is required',
  });

export async function registerFlagConfigRoutes(fastify: FastifyInstance) {
  fastify.get('/environments/:envId/flags', async (request, reply) => {
    const parsedParams = environmentParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid environment id');
    }

    const environment = await prisma.environment.findUnique({
      where: { id: parsedParams.data.envId },
      select: { id: true, projectId: true },
    });

    if (!environment) {
      return reply.notFound('Environment not found');
    }

    const flags = await prisma.flag.findMany({
      where: { projectId: environment.projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        configurations: {
          where: { environmentId: environment.id },
        },
      },
    });

    return flags.map(({ configurations, ...flag }) => {
      const configuration = configurations[0];

      return {
        ...flag,
        enabled: configuration?.enabled ?? false,
        value: configuration?.value ?? null,
      };
    });
  });

  fastify.patch('/environments/:envId/flags/:flagId', async (request, reply) => {
    const parsedParams = environmentFlagParamsSchema.safeParse(request.params);
    const parsedBody = flagConfigBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid environment or flag id');
    }

    if (!parsedBody.success) {
      return reply.badRequest('Invalid flag configuration payload');
    }

    const [environment, flag] = await Promise.all([
      prisma.environment.findUnique({
        where: { id: parsedParams.data.envId },
        select: { id: true, projectId: true },
      }),
      prisma.flag.findUnique({
        where: { id: parsedParams.data.flagId },
        select: { id: true, projectId: true },
      }),
    ]);

    if (!environment || !flag || environment.projectId !== flag.projectId) {
      return reply.notFound('Flag configuration not found');
    }

    const updateData: { enabled?: boolean; value?: Prisma.InputJsonValue } = {};

    if (parsedBody.data.enabled !== undefined) {
      updateData.enabled = parsedBody.data.enabled;
    }

    if (parsedBody.data.value !== undefined) {
      updateData.value = parsedBody.data.value as Prisma.InputJsonValue;
    }

    const configuration = await prisma.flagConfiguration.upsert({
      where: {
        environmentId_flagId: {
          environmentId: environment.id,
          flagId: flag.id,
        },
      },
      update: updateData,
      create: {
        environmentId: environment.id,
        flagId: flag.id,
        ...updateData,
      },
    });

    return configuration;
  });
}
