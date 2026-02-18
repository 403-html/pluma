import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import secureSession from '@fastify/secure-session';
import { createHash } from 'crypto';

const DEFAULT_SESSION_SECRET = 'pluma-dev-session-secret';
const SESSION_COOKIE_NAME = 'pluma_session';

export const registerSessionAuth = async (fastify: FastifyInstance) => {
  // Encrypted cookie sessions keep server state minimal while staying httpOnly/secure.
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.SESSION_SECRET ?? (isProduction ? undefined : DEFAULT_SESSION_SECRET);

  if (!secret) {
    throw new Error('SESSION_SECRET is required in production');
  }

  if (!isProduction && !process.env.SESSION_SECRET) {
    fastify.log.warn('SESSION_SECRET not set; using development fallback secret.');
  }

  const key = createHash('sha256').update(secret).digest();

  await fastify.register(cookie);
  await fastify.register(secureSession, {
    key,
    cookieName: SESSION_COOKIE_NAME,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    },
  });
};

export const requireAdminSession = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = request.session.get('userId');
  const role = request.session.get('role');

  if (!userId || !role) {
    return reply.unauthorized('Admin session required');
  }

  if (role !== 'admin') {
    return reply.forbidden('Admin role required');
  }

  request.admin = { userId: String(userId), role: 'admin' };
};
