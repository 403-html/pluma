import { stringify } from 'csv/sync';
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

const CSV_COLUMNS = [
  'timestamp', 'actorEmail', 'actorType', 'action',
  'entityType', 'entityKey', 'projectKey', 'envKey', 'flagKey',
  'ipAddress', 'requestId', 'details',
];

/** Serialises an array of audit log entries to RFC 4180 CSV. */
export function auditEntriesToCsv(entries: AuditLogEntry[]): string {
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
