import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, MAX_EMAIL_LENGTH } from '@pluma/types';
import { adminAuthHook } from '../../hooks/adminAuth';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_ROUNDS = 12;
const COOKIE_NAME = 'pluma_session';
const TOKEN_BYTES = 32;
const MAX_PASSWORD_HISTORY = 5;

// Pre-computed dummy hash used in constant-time login to prevent user enumeration via timing.
const DUMMY_HASH = '$2a$12$dummyhashforpreventingtimingattacks.placeholder000000';

const loginBodySchema = z.object({
  email: z.string().email().max(MAX_EMAIL_LENGTH),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

const registerBodySchema = z.object({
  email: z.string().email().max(MAX_EMAIL_LENGTH),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

const changePasswordBodySchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export async function registerAuthRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/auth/setup
   * Returns whether the system has been configured (i.e., at least one user exists).
   * No authentication required.
   */
  fastify.get('/setup', async (request, reply) => {
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      return reply.code(StatusCodes.NOT_FOUND).send({ configured: false });
    }

    return reply.code(StatusCodes.OK).send({ configured: true });
  });

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
   * Always runs bcrypt compare to prevent user enumeration via timing attacks.
   * Invalidates all existing sessions for the user before creating a new one.
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

    // Always compare against a hash to prevent user enumeration via timing attacks.
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const passwordValid = await compare(parsedBody.data.password, hashToCompare);

    if (!user || !passwordValid) {
      request.log.warn('Login rejected: invalid credentials');
      return reply.unauthorized(ReasonPhrases.UNAUTHORIZED);
    }

    // Invalidate all existing sessions for this user before creating a new one.
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
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
   * POST /api/v1/auth/change-password
   * Changes the password for the currently authenticated user.
   * Requires authentication via adminAuthHook.
   * Prevents reuse of the last 5 passwords (current + 4 historical).
   */
  fastify.post('/change-password', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedBody = changePasswordBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'Change password rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const sessionUser = request.sessionUser!;

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      request.log.error({ userId: sessionUser.id }, 'Change password rejected: user not found');
      return reply.unauthorized(ReasonPhrases.UNAUTHORIZED);
    }

    const oldPasswordValid = await compare(parsedBody.data.oldPassword, user.passwordHash);

    if (!oldPasswordValid) {
      request.log.warn({ userId: user.id }, 'Change password rejected: incorrect old password');
      return reply.unauthorized(ReasonPhrases.UNAUTHORIZED);
    }

    // Check if new password matches the current password
    const newPasswordMatchesCurrent = await compare(parsedBody.data.newPassword, user.passwordHash);

    if (newPasswordMatchesCurrent) {
      request.log.warn({ userId: user.id }, 'Change password rejected: new password was recently used');
      return reply.badRequest('New password was recently used');
    }

    // Check if new password matches any of the last 4 passwords in history
    // Combined with current password check above, this enforces a total of 5 unique passwords
    const passwordHistory = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: MAX_PASSWORD_HISTORY - 1, // Get last 4 entries (current is the 5th)
    });

    for (const entry of passwordHistory) {
      const matchesHistorical = await compare(parsedBody.data.newPassword, entry.passwordHash);
      if (matchesHistorical) {
        request.log.warn({ userId: user.id }, 'Change password rejected: new password was recently used');
        return reply.badRequest('New password was recently used');
      }
    }

    const newPasswordHash = await hash(parsedBody.data.newPassword, BCRYPT_ROUNDS);

    // Use a transaction to:
    // 1. Update user's password
    // 2. Insert old password hash to history
    // 3. Prune history to keep only the most recent 5 entries
    await prisma.$transaction(async (tx) => {
      // Update user's password
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Insert the old password hash to history
      await tx.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: user.passwordHash,
        },
      });

      // Count total history entries
      const historyCount = await tx.passwordHistory.count({
        where: { userId: user.id },
      });

      // If we have more than MAX_PASSWORD_HISTORY entries, delete the oldest ones
      if (historyCount > MAX_PASSWORD_HISTORY) {
        const entriesToDelete = historyCount - MAX_PASSWORD_HISTORY;
        
        // Get the oldest entries to delete
        const oldestEntries = await tx.passwordHistory.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
          take: entriesToDelete,
          select: { id: true },
        });

        const idsToDelete = oldestEntries.map((entry) => entry.id);

        await tx.passwordHistory.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }
    });

    request.log.info({ userId: user.id }, 'Password changed successfully');

    return reply.code(StatusCodes.OK).send({ message: 'Password updated' });
  });

  /**
   * GET /api/v1/auth/me
   * Returns the currently authenticated user.
   */
  fastify.get('/me', { preHandler: [adminAuthHook] }, async (request, reply) => {
    return reply.code(StatusCodes.OK).send(request.sessionUser!);
  });
}
