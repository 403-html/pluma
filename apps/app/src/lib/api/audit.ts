import type { AuditLogEntry } from '@pluma-flags/types';
import { parseErrorMessage } from './utils';

export interface AuditFilters {
  projectId?: string;
  flagId?: string;
  envId?: string;
  page?: number;
}

export interface AuditPage {
  total: number;
  page: number;
  pageSize: number;
  entries: AuditLogEntry[];
}

export async function listAuditLog(
  filters: AuditFilters = {},
): Promise<{ ok: true; data: AuditPage } | { ok: false; message: string }> {
  try {
    const params = new URLSearchParams();
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.flagId) params.set('flagId', filters.flagId);
    if (filters.envId) params.set('envId', filters.envId);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    const qs = params.toString();
    const response = await fetch(`/api/v1/audit${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load audit log');
      return { ok: false, message };
    }
    const data: AuditPage = await response.json();
    return { ok: true, data };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export interface AuditExportFilters {
  projectId?: string;
  flagId?: string;
  envId?: string;
  from?: string;
  to?: string;
}

export interface AuditExport {
  entries: AuditLogEntry[];
  count: number;
}

function buildAuditExportParams(filters: AuditExportFilters): string {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.flagId) params.set('flagId', filters.flagId);
  if (filters.envId) params.set('envId', filters.envId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Server-side only: fetches an audit export slice directly from the API server.
 * Requires `API_URL` to be set. Pass the forwarded `Cookie` header from the
 * incoming Next.js request so the Fastify session check passes.
 */
export async function fetchAuditExport(
  filters: AuditExportFilters,
  cookieHeader: string,
): Promise<{ ok: true; data: AuditExport } | { ok: false; message: string }> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return { ok: false, message: 'API not configured' };
  }
  try {
    const response = await fetch(`${apiUrl}/api/v1/audit/export${buildAuditExportParams(filters)}`, {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to export audit log');
      return { ok: false, message };
    }
    const data: AuditExport = await response.json();
    return { ok: true, data };
  } catch (err) {
    console.error('[fetchAuditExport] upstream fetch failed', err);
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
