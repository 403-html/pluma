import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';
import { MAX_PROJECT_KEY_LENGTH, MAX_PROJECT_NAME_LENGTH, PROJECT_KEY_REGEX } from '@pluma/types';
import { writeAuditLog } from '../../lib/audit';

const PAGE_SIZE = 100;

const projectBodySchema = z.object({
  key: z.string().min(1).max(MAX_PROJECT_KEY_LENGTH).regex(PROJECT_KEY_REGEX, 'Invalid project key format'),
  name: z.string().min(1).max(MAX_PROJECT_NAME_LENGTH),
});

const projectUpdateBodySchema = z
  .object({
    key: z.string().min(1).max(MAX_PROJECT_KEY_LENGTH).regex(PROJECT_KEY_REGEX, 'Invalid project key format').optional(),
    name: z.string().min(1).max(MAX_PROJECT_NAME_LENGTH).optional(),
  })
  .refine((body) => body.key !== undefined || body.name !== undefined, {
    message: 'At least one field is required',
  });

const projectParamsSchema = z.object({
  id: z.uuid(),
});

export async function registerProjectRoutes(fastify: FastifyInstance) {
  fastify.get('/projects', { preHandler: [adminAuthHook] }, async () => {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      include: {
        environments: { select: { id: true, key: true, name: true } },
      },
    });

    return projects;
  });

  fastify.get('/projects/:id', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      request.log.warn({ params: request.params }, 'GET /projects/:id rejected: invalid id');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!project) {
      request.log.warn({ projectId: parsedParams.data.id }, 'GET /projects/:id rejected: project not found');
      return reply.notFound(ReasonPhrases.NOT_FOUND);
    }

    return project;
  });

  fastify.post('/projects', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedBody = projectBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /projects rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    try {
      const project = await prisma.project.create({
        data: parsedBody.data,
      });

      await writeAuditLog({
        action: 'create',
        entityType: 'project',
        entityId: project.id,
        entityKey: project.key,
        projectId: project.id,
        projectKey: project.key,
        actorId: request.sessionUserId!,
        actorEmail: request.sessionUser!.email,
      });

      return reply.code(StatusCodes.CREATED).send(project);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        request.log.warn({ key: parsedBody.data.key }, 'POST /projects rejected: key already exists');
        return reply.conflict(ReasonPhrases.CONFLICT);
      }

      throw error;
    }
  });

  fastify.patch('/projects/:id', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    const parsedBody = projectUpdateBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      request.log.warn({ params: request.params }, 'PATCH /projects/:id rejected: invalid id');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'PATCH /projects/:id rejected: invalid payload');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    try {
      const project = await prisma.project.update({
        where: { id: parsedParams.data.id },
        data: parsedBody.data,
      });

      await writeAuditLog({
        action: 'update',
        entityType: 'project',
        entityId: project.id,
        entityKey: project.key,
        projectId: project.id,
        projectKey: project.key,
        actorId: request.sessionUserId!,
        actorEmail: request.sessionUser!.email,
        details: parsedBody.data,
      });

      return project;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        request.log.warn({ projectId: parsedParams.data.id }, 'PATCH /projects/:id rejected: project not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        request.log.warn({ key: parsedBody.data.key }, 'PATCH /projects/:id rejected: key already exists');
        return reply.conflict(ReasonPhrases.CONFLICT);
      }

      throw error;
    }
  });

  fastify.delete('/projects/:id', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      request.log.warn({ params: request.params }, 'DELETE /projects/:id rejected: invalid id');
      return reply.badRequest(ReasonPhrases.BAD_REQUEST);
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: parsedParams.data.id },
      });

      if (!project) {
        request.log.warn({ projectId: parsedParams.data.id }, 'DELETE /projects/:id rejected: project not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      await prisma.project.delete({
        where: { id: parsedParams.data.id },
      });

      await writeAuditLog({
        action: 'delete',
        entityType: 'project',
        entityId: project.id,
        entityKey: project.key,
        projectId: project.id,
        projectKey: project.key,
        actorId: request.sessionUserId!,
        actorEmail: request.sessionUser!.email,
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        request.log.warn({ projectId: parsedParams.data.id }, 'DELETE /projects/:id rejected: project not found');
        return reply.notFound(ReasonPhrases.NOT_FOUND);
      }

      throw error;
    }
  });
}
