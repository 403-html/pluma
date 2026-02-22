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

export async function writeAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({ data: params });
}
