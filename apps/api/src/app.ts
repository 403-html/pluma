import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
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
import { registerSdkRoutes } from './routes/sdk/snapshot';

type BuildAppOptions = {
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const { logger = true } = options;

  const fastify = Fastify({
    logger,
  });

  // Register OpenAPI/Swagger plugins before routes so all route schemas are captured
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Pluma API',
        description: 'Feature flag management API for Pluma',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Server health and liveness' },
        { name: 'Auth', description: 'Admin authentication and session management' },
        { name: 'Projects', description: 'Project management' },
        { name: 'Flags', description: 'Feature flag management' },
        { name: 'Environments', description: 'Environment management' },
        { name: 'Tokens', description: 'SDK token management' },
        { name: 'Audit', description: 'Audit log queries' },
        { name: 'SDK', description: 'SDK endpoints for flag evaluation' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'pluma_session',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Register remaining plugins
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
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Returns server liveness status and current timestamp.',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['status', 'timestamp'],
        },
      },
    },
  }, async () => {
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

