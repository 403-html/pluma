import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '@pluma-flags/db';
import { AuditActions, AuditEntityTypes, AuditActorTypes, UserRoles } from '@pluma-flags/types';
import { adminAuthHook } from '../../hooks/adminAuth';
import { writeAuditLog } from '../../lib/audit';

const ORG_SETTINGS_ID = 'default';

const patchOrgSettingsBodySchema = z.object({
  allowedDomains: z
    .array(
      // RFC 1035: maximum DNS label length is 63 chars; full FQDN max is 253 chars.
      z.string().min(1).max(253),
    )
    // Practical upper bound — prevents unbounded growth in the DB array column.
    .max(100)
    .optional(),
  // Configurable From address; empty string means use the server-level SMTP_FROM env var.
  smtpFrom: z.string().max(320).optional(),
  // When true, a welcome email is sent to newly registered users.
  sendWelcomeEmail: z.boolean().optional(),
}).refine(
  (d) => d.allowedDomains !== undefined || d.smtpFrom !== undefined || d.sendWelcomeEmail !== undefined,
  { message: 'At least one field must be provided' },
);

function buildOrgSettingsResponse(settings: {
  allowedDomains: string[];
  smtpFrom: string;
  sendWelcomeEmail: boolean;
  updatedAt: Date;
}) {
  return {
    allowedDomains: settings.allowedDomains,
    smtpFrom: settings.smtpFrom,
    sendWelcomeEmail: settings.sendWelcomeEmail,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function registerOrgSettingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/org/settings
   * Returns the current org settings. Upserts the default row if it does not exist.
   * Accessible by any authenticated user.
   */
  fastify.get('/settings', { preHandler: [adminAuthHook] }, async (_request, reply) => {
    const settings = await prisma.orgSettings.upsert({
      where: { id: ORG_SETTINGS_ID },
      update: {},
      create: { id: ORG_SETTINGS_ID, allowedDomains: [], smtpFrom: '', sendWelcomeEmail: false },
    });

    return reply.code(StatusCodes.OK).send(buildOrgSettingsResponse(settings));
  });

  /**
   * PATCH /api/v1/org/settings
   * Updates org settings (partial — at least one field required).
   * Requires operator or admin role (403 for user role).
   */
  fastify.patch('/settings', { preHandler: [adminAuthHook] }, async (request, reply) => {
    const actor = request.sessionUser!;

    if (actor.role === UserRoles.USER) {
      request.log.warn({ actorId: actor.id }, 'PATCH /org/settings rejected: insufficient role');
      return reply.code(StatusCodes.FORBIDDEN).send({ error: 'Forbidden' });
    }

    const parsedBody = patchOrgSettingsBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      request.log.warn({ issues: parsedBody.error.flatten() }, 'PATCH /org/settings rejected: invalid payload');
      return reply.badRequest('Invalid request body');
    }

    const { allowedDomains, smtpFrom, sendWelcomeEmail } = parsedBody.data;

    const updateData: { allowedDomains?: string[]; smtpFrom?: string; sendWelcomeEmail?: boolean } = {};
    if (allowedDomains !== undefined) updateData.allowedDomains = allowedDomains;
    if (smtpFrom !== undefined) updateData.smtpFrom = smtpFrom;
    if (sendWelcomeEmail !== undefined) updateData.sendWelcomeEmail = sendWelcomeEmail;

    const updated = await prisma.orgSettings.upsert({
      where: { id: ORG_SETTINGS_ID },
      update: updateData,
      create: { id: ORG_SETTINGS_ID, allowedDomains: [], smtpFrom: '', sendWelcomeEmail: false, ...updateData },
    });

    try {
      await writeAuditLog({
        action: AuditActions.UPDATE,
        entityType: AuditEntityTypes.ORG_SETTINGS,
        entityId: ORG_SETTINGS_ID,
        entityKey: 'org-settings',
        actorId: actor.id,
        actorEmail: actor.email,
        details: { after: updateData },
        meta: {
          ip: request.ip,
          ua: request.headers['user-agent'] as string | undefined,
          requestId: request.id,
          actorType: AuditActorTypes.USER,
        },
      });
    } catch (auditError) {
      request.log.error({ err: auditError }, 'PATCH /org/settings: failed to write audit log');
    }

    request.log.info({ actorId: actor.id }, 'Org settings updated');

    return reply.code(StatusCodes.OK).send(buildOrgSettingsResponse(updated));
  });
}
