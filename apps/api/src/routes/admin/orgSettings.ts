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
      z
        .string()
        .min(1)
        .max(253)
        .transform((value) => value.trim().toLowerCase())
        .refine(
          (value) => {
            if (value.length === 0) {
              return false;
            }
            // Only allow letters, digits, dots and hyphens.
            if (!/^[a-z0-9.-]+$/.test(value)) {
              return false;
            }
            // Disallow leading/trailing dot or hyphen.
            if (value.startsWith('.') || value.endsWith('.') || value.startsWith('-') || value.endsWith('-')) {
              return false;
            }
            // Disallow empty labels (e.g. "example..com").
            if (value.includes('..')) {
              return false;
            }
            return true;
          },
          { message: 'allowedDomains must contain valid domain names' },
        ),
    )
    // Practical upper bound — prevents unbounded growth in the DB array column.
    .max(100)
    .optional(),
  // SMTP connection settings (moved from env vars).
  smtpHost: z
    .string()
    .max(253)
    .transform((v) => v.trim())
    .refine(
      (v) => v === '' || /^[a-zA-Z0-9.-]+$/.test(v),
      { message: 'smtpHost must be a valid hostname' },
    )
    .optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().max(320).transform((v) => v.trim()).optional(),
  // Empty string clears the stored password; omitting leaves it unchanged.
  smtpPass: z.string().max(1024).optional(),
  // Configurable From address; empty string means use the server-level SMTP_FROM env var.
  smtpFrom: z
    .string()
    .max(320)
    .transform((value) => value.trim())
    .refine(
      (value) => !value.includes('\r') && !value.includes('\n'),
      { message: 'smtpFrom must not contain CR or LF characters' },
    )
    .refine(
      (value) => {
        // Empty string is allowed: use server-level SMTP_FROM env var.
        if (value === '') {
          return true;
        }
        // Lightweight email shape check: non-empty local and domain parts.
        const atIndex = value.indexOf('@');
        if (atIndex <= 0 || atIndex === value.length - 1) {
          return false;
        }
        if (/\s/.test(value)) {
          return false;
        }
        return true;
      },
      { message: 'smtpFrom must be a valid email address or an empty string' },
    )
    .optional(),
  // When true, a welcome email is sent to newly registered users.
  sendWelcomeEmail: z.boolean().optional(),
}).refine(
  (d) =>
    d.allowedDomains !== undefined ||
    d.smtpHost !== undefined ||
    d.smtpPort !== undefined ||
    d.smtpSecure !== undefined ||
    d.smtpUser !== undefined ||
    d.smtpPass !== undefined ||
    d.smtpFrom !== undefined ||
    d.sendWelcomeEmail !== undefined,
  { message: 'At least one field must be provided' },
);

type OrgSettingsUpdateData = {
  allowedDomains?: string[];
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  sendWelcomeEmail?: boolean;
};

function buildOrgSettingsResponse(settings: {
  id: string;
  allowedDomains: string[];
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  sendWelcomeEmail: boolean;
  updatedAt: Date;
}) {
  return {
    id: settings.id,
    allowedDomains: settings.allowedDomains,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpPassSet: settings.smtpPass !== '',
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
      create: { id: ORG_SETTINGS_ID, allowedDomains: [], smtpHost: '', smtpPort: 587, smtpSecure: false, smtpUser: '', smtpPass: '', smtpFrom: '', sendWelcomeEmail: false },
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

    const { allowedDomains, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, sendWelcomeEmail } = parsedBody.data;

    const updateData: OrgSettingsUpdateData = {};
    if (allowedDomains !== undefined) updateData.allowedDomains = allowedDomains;
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
    if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    if (smtpPass !== undefined) updateData.smtpPass = smtpPass;
    if (smtpFrom !== undefined) updateData.smtpFrom = smtpFrom;
    if (sendWelcomeEmail !== undefined) updateData.sendWelcomeEmail = sendWelcomeEmail;

    const updated = await prisma.orgSettings.upsert({
      where: { id: ORG_SETTINGS_ID },
      update: updateData,
      create: { id: ORG_SETTINGS_ID, allowedDomains: [], smtpHost: '', smtpPort: 587, smtpSecure: false, smtpUser: '', smtpPass: '', smtpFrom: '', sendWelcomeEmail: false, ...updateData },
    });

    try {
      // Redact smtpPass from the audit log to avoid storing credentials.
      const auditAfter: OrgSettingsUpdateData = { ...updateData };
      if (auditAfter.smtpPass !== undefined) {
        auditAfter.smtpPass = '[redacted]';
      }
      await writeAuditLog({
        action: AuditActions.UPDATE,
        entityType: AuditEntityTypes.ORG_SETTINGS,
        entityId: ORG_SETTINGS_ID,
        entityKey: 'org-settings',
        actorId: actor.id,
        actorEmail: actor.email,
        details: { after: auditAfter },
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
