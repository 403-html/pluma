import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Register plugins
  await fastify.register(cors);
  await fastify.register(helmet);
  await fastify.register(sensible);

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return fastify;
}
