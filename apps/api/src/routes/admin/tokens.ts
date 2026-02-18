import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth.js';

const TOKEN_BYTES = 32;
const TOKEN_PREFIX = 'pluma_';

const tokenBodySchema = z.object({
  name: z.string().min(1).max(100),
});

const projectParamsSchema = z.object({
  id: z.uuid(),
});

const tokenParamsSchema = z.object({
  id: z.uuid(),
  tokenId: z.uuid(),
});

export async function registerTokenRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/projects/:id/tokens
   * Lists all SDK tokens for a project (excludes revoked).
   */
  fastify.get(
    '/projects/:id/tokens',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.badRequest('Invalid project id');
      }

      const project = await prisma.project.findUnique({
        where: { id: parsedParams.data.id },
      });

      if (!project) {
        return reply.notFound('Project not found');
      }

      const tokens = await prisma.sdkToken.findMany({
        where: { projectId: parsedParams.data.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, projectId: true, name: true, createdAt: true, revokedAt: true },
      });

      return tokens;
    },
  );

  /**
   * POST /api/v1/projects/:id/tokens
   * Creates a new SDK token for a project. Returns the raw token once.
   */
  fastify.post(
    '/projects/:id/tokens',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);
      const parsedBody = tokenBodySchema.safeParse(request.body);

      if (!parsedParams.success) {
        return reply.badRequest('Invalid project id');
      }

      if (!parsedBody.success) {
        return reply.badRequest('Invalid token payload');
      }

      const project = await prisma.project.findUnique({
        where: { id: parsedParams.data.id },
      });

      if (!project) {
        return reply.notFound('Project not found');
      }

      const rawToken = TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      const sdkToken = await prisma.sdkToken.create({
        data: {
          projectId: parsedParams.data.id,
          name: parsedBody.data.name,
          tokenHash,
        },
        select: { id: true, projectId: true, name: true, createdAt: true, revokedAt: true },
      });

      return reply.code(StatusCodes.CREATED).send({ ...sdkToken, token: rawToken });
    },
  );

  /**
   * DELETE /api/v1/projects/:id/tokens/:tokenId
   * Revokes a SDK token (sets revokedAt).
   */
  fastify.delete(
    '/projects/:id/tokens/:tokenId',
    { preHandler: [adminAuthHook] },
    async (request, reply) => {
      const parsedParams = tokenParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.badRequest('Invalid params');
      }

      try {
        await prisma.sdkToken.update({
          where: {
            id: parsedParams.data.tokenId,
            projectId: parsedParams.data.id,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });

        return reply.code(StatusCodes.NO_CONTENT).send();
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
          return reply.notFound('Token not found');
        }

        throw error;
      }
    },
  );
}
