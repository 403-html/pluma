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
