'use server';

import { cookies } from 'next/headers';
import { serializeCookies } from '@/lib/api/utils';
import { fetchAuditExport } from '@/lib/api/audit';

export interface ExportAuditCsvFilters {
  projectId?: string;
  envId?: string;
  flagId?: string;
}

export async function exportAuditCsv(
  filters: ExportAuditCsvFilters,
): Promise<{ ok: true; csv: string } | { ok: false; message: string }> {
  const cookieStore = await cookies();
  const cookieHeader = serializeCookies(cookieStore);
  return fetchAuditExport(filters, cookieHeader);
}
