import { prisma, type Prisma } from '@pluma/db';
import type { AuditAction, AuditEntityType } from '@pluma/types';

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
  await db.auditLog.create({ data: params });
}
