function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

function fmtPairs(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '—';
  return entries.map(([k, v]) => `${k} → ${fmtValue(v)}`).join(', ');
}

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
    return `changed: ${fmtPairs(d.diff as Record<string, unknown>)}`;
  }
  const parts: string[] = [];
  if (d.before && typeof d.before === 'object') {
    parts.push(`before: ${fmtPairs(d.before as Record<string, unknown>)}`);
  }
  if (d.after && typeof d.after === 'object') {
    parts.push(`after: ${fmtPairs(d.after as Record<string, unknown>)}`);
  }
  if (parts.length > 0) return parts.join('\n');
  return JSON.stringify(details);
}
