import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAdminConfig, verifyAdminCredentials } from '../auth/admin-config.js';
import { requireAdminSession } from '../auth/admin-session.js';

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerAuthRoutes(fastify: FastifyInstance) {
  const loginRateLimit = fastify.rateLimit({
    max: 10,
    timeWindow: '1 minute',
  });

  fastify.post('/login', { preHandler: loginRateLimit }, async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.badRequest('Invalid login payload');
    }

    const { email, password } = parsedBody.data;

    if (!verifyAdminCredentials(email, password)) {
      return reply.unauthorized('Invalid email or password');
    }

    const admin = getAdminConfig();
    request.session.set('userId', admin.userId);
    request.session.set('role', admin.role);

    return reply.send({ userId: admin.userId, role: admin.role, email: admin.email });
  });

  fastify.post(
    '/logout',
    { preHandler: requireAdminSession },
    async (request, reply) => {
      request.session.delete();
      return reply.code(204).send();
    },
  );

  fastify.get('/me', { preHandler: requireAdminSession }, async (request) => {
    return request.admin;
  });
}
