import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { registerSessionAuth, requireAdminSession } from './auth/admin-session.js';
import { requireSdkToken } from './auth/sdk-token.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerEnvironmentRoutes } from './routes/environments.js';
import { registerFlagConfigRoutes } from './routes/flag-configs.js';
import { registerFlagRoutes } from './routes/flags.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerSdkRoutes } from './routes/sdk.js';
import { registerSdkTokenRoutes } from './routes/sdk-tokens.js';

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
  await fastify.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });
  await registerSessionAuth(fastify);

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await fastify.register(registerAuthRoutes, { prefix: '/api/v1/auth' });

  await fastify.register(
    async (adminScope) => {
      adminScope.addHook('onRequest', requireAdminSession);
      await registerProjectRoutes(adminScope);
      await registerEnvironmentRoutes(adminScope);
      await registerFlagRoutes(adminScope);
      await registerFlagConfigRoutes(adminScope);
      await registerSdkTokenRoutes(adminScope);
    },
    { prefix: '/api/v1' },
  );

  await fastify.register(
    async (sdkScope) => {
      sdkScope.addHook('onRequest', requireSdkToken);
      await registerSdkRoutes(sdkScope);
    },
    { prefix: '/sdk/v1' },
  );

  return fastify;
}
