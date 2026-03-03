import type { AuditLogEntry } from '@pluma-flags/types';

/**
 * Formats an audit log `details` value into a human-readable string.
 *
 * Priority order for structured details:
 * 1. `reason` – free-text explanation surfaced directly
 * 2. `diff`   – lists the changed field keys ("changed: key1, key2")
 * 3. `after`  – lists the new-state field keys ("after: key1, key2")
 * 4. fallback – JSON.stringify for any other object shape
 */
export function formatDetails(details: unknown): string {
  if (details === null || details === undefined) return '—';
  if (typeof details === 'string') return details || '—';
  if (typeof details === 'number' || typeof details === 'boolean') return String(details);
  if (typeof details !== 'object') return '—';
  const d = details as Record<string, unknown>;
  if (Object.keys(d).length === 0) return '—';
  // Surface structured audit details fields
  if (d.reason && typeof d.reason === 'string') return d.reason;
  if (d.diff && typeof d.diff === 'object') {
    const keys = Object.keys(d.diff as object);
    return keys.length ? `changed: ${keys.join(', ')}` : '—';
  }
  if (d.after && typeof d.after === 'object') {
    const keys = Object.keys(d.after as object);
    return keys.length ? `after: ${keys.join(', ')}` : '—';
  }
  return JSON.stringify(details);
}

const CSV_HEADERS = [
  'timestamp', 'actorEmail', 'actorType', 'action',
  'entityType', 'entityKey', 'projectKey', 'envKey', 'flagKey',
  'ipAddress', 'requestId', 'details',
];

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialises an array of audit log entries to RFC 4180 CSV. */
export function auditEntriesToCsv(entries: AuditLogEntry[]): string {
  const rows = entries.map((e) => [
    e.createdAt,
    e.actorEmail,
    e.actorType ?? '',
    e.action,
    e.entityType,
    e.entityKey ?? '',
    e.projectKey ?? '',
    e.envKey ?? '',
    e.flagKey ?? '',
    e.ipAddress ?? '',
    e.requestId ?? '',
    formatDetails(e.details),
  ].map(csvCell).join(','));
  return [CSV_HEADERS.join(','), ...rows].join('\r\n') + '\r\n';
}
