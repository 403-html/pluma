import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { registerAuthRoutes } from './routes/admin/auth';
import { registerProjectRoutes } from './routes/admin/projects';
import { registerTokenRoutes } from './routes/admin/tokens';
import { registerEnvTokenRoutes } from './routes/admin/envTokens';
import { registerOrgTokenRoutes } from './routes/admin/orgTokens';
import { registerFlagRoutes } from './routes/admin/flags';
import { registerEnvironmentRoutes } from './routes/admin/environments';
import { registerFlagConfigRoutes } from './routes/admin/flagConfigs';
import { registerAuditRoutes } from './routes/admin/audit';
import { registerDashboardRoutes } from './routes/admin/dashboard';
import { registerSdkRoutes } from './routes/sdk/snapshot';

type BuildAppOptions = {
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const { logger = true } = options;

  const fastify = Fastify({
    logger,
  });

  // Register plugins
  await fastify.register(cors);
  await fastify.register(helmet);
  await fastify.register(sensible);
  await fastify.register(cookie);

  // Global error handler for Prisma errors
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof Error && error.constructor.name.startsWith('PrismaClient')) {
      request.log.error({ err: error }, 'Unhandled Prisma error');
      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
    }
    return reply.send(error);
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Admin API: /api/v1/*
  await fastify.register(
    async (adminApi) => {
      await adminApi.register(
        async (authApi) => {
          await registerAuthRoutes(authApi);
        },
        { prefix: '/auth' },
      );
      await registerProjectRoutes(adminApi);
      await registerTokenRoutes(adminApi);
      await registerEnvTokenRoutes(adminApi);
      await registerOrgTokenRoutes(adminApi);
      await registerFlagRoutes(adminApi);
      await registerEnvironmentRoutes(adminApi);
      await registerFlagConfigRoutes(adminApi);
      await registerAuditRoutes(adminApi);
      await registerDashboardRoutes(adminApi);
    },
    { prefix: '/api/v1' },
  );

  // SDK API: /sdk/v1/*
  await fastify.register(
    async (sdkApi) => {
      await registerSdkRoutes(sdkApi);
    },
    { prefix: '/sdk/v1' },
  );

  return fastify;
}

