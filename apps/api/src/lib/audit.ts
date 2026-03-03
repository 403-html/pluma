import { prisma, type Prisma } from '@pluma-flags/db';
import type { AuditAction, AuditEntityType, AuditMeta } from '@pluma-flags/types';

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
  details?: Prisma.InputJsonValue;
  meta?: AuditMeta;
}

function buildMetaFields(meta?: AuditMeta): Record<string, unknown> {
  if (!meta) return {};
  return {
    actorType: meta.actorType,
    actorRole: meta.actorRole,
    sessionId: meta.sessionId,
    tokenId: meta.tokenId,
    ipAddress: meta.ip,
    userAgent: meta.ua,
    requestId: meta.requestId,
    isSystemAction: meta.isSystemAction,
  };
}

/**
 * Writes a single audit log entry to the database.
 *
 * Call this after every successful admin mutation (create / update / delete /
 * enable / disable) to maintain a tamper-evident trail of who changed what and
 * when.
 *
 * To ensure transactional coupling with a mutation, pass a Prisma
 * TransactionClient obtained from `prisma.$transaction` as the second
 * argument. Otherwise, the shared Prisma client is used by default.
 */
export async function writeAuditLog(
  params: AuditParams,
  client?: Prisma.TransactionClient,
): Promise<void> {
  const db = client ?? prisma;
  const { meta, ...rest } = params;
  await db.auditLog.create({
    data: { ...rest, ...buildMetaFields(meta) },
  });
}
