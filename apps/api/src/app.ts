import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { registerProjectRoutes } from './routes/projects.js';

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

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await registerProjectRoutes(fastify);

  return fastify;
}
