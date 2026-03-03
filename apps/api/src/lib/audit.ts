import { z } from 'zod';
import { prisma, type Prisma } from '@pluma-flags/db';
import type { AuditAction, AuditEntityType, AuditMeta } from '@pluma-flags/types';

const auditDetailsSchema = z.object({
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
  diff: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().max(500).optional(),
}).refine(
  (d) => d.before !== undefined || d.after !== undefined || d.diff !== undefined || d.reason !== undefined,
  { message: 'details must contain at least one of: before, after, diff, reason' },
).optional();

export type AuditDetails = z.input<typeof auditDetailsSchema>;

export interface AuditParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityKey?: string;
  projectId?: string;
  projectKey?: string;
  envId?: string;
  envKey?: string;
  flagId?: string;
  flagKey?: string;
  actorId: string;
  actorEmail: string;
  details?: AuditDetails;
  meta?: AuditMeta;
}

function buildMetaFields(meta?: AuditMeta): Record<string, unknown> {
  if (!meta) return {};
  const raw: Record<string, unknown> = {
    actorType: meta.actorType,
    actorRole: meta.actorRole,
    sessionId: meta.sessionId,
    tokenId: meta.tokenId,
    ipAddress: meta.ip,
    userAgent: meta.ua,
    requestId: meta.requestId,
    isSystemAction: meta.isSystemAction,
  };
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
}

function validateDetails(details: AuditDetails): Prisma.InputJsonValue | undefined {
  const result = auditDetailsSchema.safeParse(details);
  if (!result.success) {
    console.warn('[audit] details validation failed, storing null', result.error.message);
    return undefined;
  }
  if (result.data === undefined || result.data === null) return undefined;
  return result.data as Prisma.InputJsonValue;
}

export async function writeAuditLog(
  params: AuditParams,
  client?: Prisma.TransactionClient,
): Promise<void> {
  const db = client ?? prisma;
  const { meta, details, ...rest } = params;
  const validatedDetails = details !== undefined ? validateDetails(details) : undefined;
  await db.auditLog.create({
    data: {
      ...rest,
      ...(validatedDetails !== undefined ? { details: validatedDetails } : {}),
      ...buildMetaFields(meta),
    },
  });
}
