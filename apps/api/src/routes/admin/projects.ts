import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
      return reply.badRequest('Invalid project id');
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!project) {
      return reply.notFound('Project not found');
    }

    return project;
  });

  fastify.post('/projects', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedBody = projectBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.badRequest('Invalid project payload');
    }

    try {
      const project = await prisma.project.create({
        data: parsedBody.data,
      });

      return reply.code(201).send(project);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return reply.conflict('Project key already exists');
      }

      throw error;
    }
  });

  fastify.patch('/projects/:id', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    const parsedBody = projectUpdateBodySchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    if (!parsedBody.success) {
      return reply.badRequest('Invalid project payload');
    }

    try {
      const project = await prisma.project.update({
        where: { id: parsedParams.data.id },
        data: parsedBody.data,
      });

      return project;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        return reply.notFound('Project not found');
      }

      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return reply.conflict('Project key already exists');
      }

      throw error;
    }
  });

  fastify.delete('/projects/:id', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.badRequest('Invalid project id');
    }

    try {
      await prisma.project.delete({
        where: { id: parsedParams.data.id },
      });

      return reply.code(204).send();
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
        return reply.notFound('Project not found');
      }

      throw error;
    }
  });
}
