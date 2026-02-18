import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth.js';

const projectBodySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
});

const projectUpdateBodySchema = z
  .object({
    key: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .refine((body) => body.key !== undefined || body.name !== undefined, {
    message: 'At least one field is required',
  });

const projectParamsSchema = z.object({
  id: z.uuid(),
});

export async function registerProjectRoutes(fastify: FastifyInstance) {
  fastify.get('/projects', { preHandler: [adminAuthHook] }, async () => {
    return prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
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
      await prisma.project.delete({
        where: { id: parsedParams.data.id },
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
