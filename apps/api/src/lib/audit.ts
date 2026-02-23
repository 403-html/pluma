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
 * when.  The call is synchronous — await it so that a write failure surfaces
 * immediately rather than being silently swallowed.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({ data: params });
}
