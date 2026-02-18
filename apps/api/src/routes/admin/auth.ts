import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_ROUNDS = 12;
const COOKIE_NAME = 'pluma_session';
const TOKEN_BYTES = 32;

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerAuthRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/auth/register
   * Creates the first admin user. Returns 409 if any user already exists.
   */
  fastify.post('/register', async (request, reply) => {
    const parsedBody = registerBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'Register rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const existingCount = await prisma.user.count();

    if (existingCount > 0) {
      request.log.warn('Register rejected: admin user already exists');
      return reply.conflict(ReasonPhrases.CONFLICT);
    }

    const passwordHash = await hash(parsedBody.data.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { email: parsedBody.data.email, passwordHash },
    });

    return reply.code(StatusCodes.CREATED).send({ id: user.id, email: user.email, createdAt: user.createdAt });
  });

  /**
   * POST /api/v1/auth/login
   * Validates credentials and creates a session cookie.
   */
  fastify.post('/login', async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'Login rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const user = await prisma.user.findUnique({
      where: { email: parsedBody.data.email },
    });

    if (!user) {
      request.log.warn('Login rejected: user not found');
      return reply.unauthorized(ReasonPhrases.UNAUTHORIZED);
    }

    const passwordValid = await compare(parsedBody.data.password, user.passwordHash);

    if (!passwordValid) {
      request.log.warn({ userId: user.id }, 'Login rejected: invalid password');
      return reply.unauthorized(ReasonPhrases.UNAUTHORIZED);
    }

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return reply.code(StatusCodes.OK).send({ id: user.id, email: user.email, createdAt: user.createdAt });
  });

  /**
   * POST /api/v1/auth/logout
   * Deletes the current session and clears the session cookie.
   */
  fastify.post('/logout', async (request, reply) => {
    const sessionToken = request.cookies[COOKIE_NAME];

    if (sessionToken) {
      await prisma.session.deleteMany({ where: { token: sessionToken } });
    }

    reply.clearCookie(COOKIE_NAME, { path: '/' });

    return reply.code(StatusCodes.NO_CONTENT).send();
  });

  /**
   * GET /api/v1/auth/me
   * Returns the currently authenticated user.
   */
  fastify.get('/me', { preHandler: [] }, async (request, reply) => {
    const sessionToken = request.cookies[COOKIE_NAME];

    if (!sessionToken) {
      request.log.warn('GET /me rejected: missing session cookie');
      return reply.unauthorized(ReasonPhrases.UNAUTHORIZED);
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      request.log.warn('GET /me rejected: session not found or expired');
      return reply.unauthorized(ReasonPhrases.UNAUTHORIZED);
    }

    return { id: session.user.id, email: session.user.email, createdAt: session.user.createdAt };
  });
}
