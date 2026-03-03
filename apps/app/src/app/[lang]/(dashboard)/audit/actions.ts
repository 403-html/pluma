'use server';

import { cookies } from 'next/headers';
import { stringify } from 'csv/sync';
import { serializeCookies } from '@/lib/api/utils';
import { formatDetails } from '@/lib/auditUtils';
import type { AuditExport } from '@/lib/api/audit';
import type { AuditLogEntry } from '@pluma-flags/types';

const CSV_COLUMNS = [
  'timestamp', 'actorEmail', 'actorType', 'action',
  'entityType', 'entityKey', 'projectKey', 'envKey', 'flagKey',
  'ipAddress', 'requestId', 'details',
];

// Matches the server-side EXPORT_LIMIT — prevents unbounded memory allocation.
const MAX_CSV_ROWS = 1_000;

function entriesToCsv(entries: AuditLogEntry[]): string {
  if (!Array.isArray(entries)) return '';
  if (entries.length > MAX_CSV_ROWS) return '';
  const records = entries.map((e) => ({
    timestamp: e.createdAt,
    actorEmail: e.actorEmail,
    actorType: e.actorType ?? '',
    action: e.action,
    entityType: e.entityType,
    entityKey: e.entityKey ?? '',
    projectKey: e.projectKey ?? '',
    envKey: e.envKey ?? '',
    flagKey: e.flagKey ?? '',
    ipAddress: e.ipAddress ?? '',
    requestId: e.requestId ?? '',
    details: formatDetails(e.details),
  }));
  return stringify(records, { header: true, columns: CSV_COLUMNS });
}

export interface ExportAuditCsvFilters {
  projectId?: string;
  envId?: string;
  flagId?: string;
}

export async function exportAuditCsv(
  filters: ExportAuditCsvFilters,
): Promise<{ ok: true; csv: string } | { ok: false; message: string }> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return { ok: false, message: 'API not configured' };
  }

  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.envId) params.set('envId', filters.envId);
  if (filters.flagId) params.set('flagId', filters.flagId);
  const qs = params.toString();

  const cookieStore = await cookies();
  const cookieHeader = serializeCookies(cookieStore);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/v1/audit/export${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }

  if (!response.ok) {
    return { ok: false, message: 'Failed to export audit log' };
  }

  const data = await response.json() as AuditExport;
  return { ok: true, csv: entriesToCsv(data.entries) };
}
