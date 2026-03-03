import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── formatDetails ─────────────────────────────────────────────────────────────

// Mirror the private formatDetails logic for isolated testing
function formatDetails(details: unknown): string {
  if (details === null || details === undefined) return '—';
  if (typeof details === 'string') return details || '—';
  if (typeof details === 'number' || typeof details === 'boolean') return String(details);
  if (typeof details !== 'object') return '—';
  const d = details as Record<string, unknown>;
  if (Object.keys(d).length === 0) return '—';
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

describe('formatDetails', () => {
  it('returns — for null', () => {
    expect(formatDetails(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatDetails(undefined)).toBe('—');
  });

  it('returns — for empty object', () => {
    expect(formatDetails({})).toBe('—');
  });

  it('returns a non-empty string as-is', () => {
    expect(formatDetails('some message')).toBe('some message');
  });

  it('returns — for empty string', () => {
    expect(formatDetails('')).toBe('—');
  });

  it('converts number to string', () => {
    expect(formatDetails(42)).toBe('42');
  });

  it('converts boolean to string', () => {
    expect(formatDetails(true)).toBe('true');
  });

  it('returns — for non-string/number/boolean non-object types', () => {
    // symbol and bigint are not valid JSON so they fall through to —
    expect(formatDetails(Symbol('test') as unknown)).toBe('—');
  });

  it('surfaces reason string', () => {
    expect(formatDetails({ reason: 'bulk migration' })).toBe('bulk migration');
  });

  it('surfaces diff keys', () => {
    expect(formatDetails({ diff: { name: 'new', key: 'old' } })).toBe('changed: name, key');
  });

  it('surfaces after keys', () => {
    expect(formatDetails({ after: { enabled: true } })).toBe('after: enabled');
  });

  it('falls back to JSON.stringify for unknown shape', () => {
    expect(formatDetails({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });
});

// ── exportAuditLog ────────────────────────────────────────────────────────────

describe('exportAuditLog', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('builds correct URL with no filters', async () => {
    const { exportAuditLog } = await import('@/lib/api/audit');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [], count: 0 }),
    } as Response);

    const result = await exportAuditLog();
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/v1/audit/export', expect.any(Object));
  });

  it('builds URL with from/to filters', async () => {
    const { exportAuditLog } = await import('@/lib/api/audit');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [], count: 0 }),
    } as Response);

    await exportAuditLog({ from: '2024-01-01T00:00:00Z', to: '2024-12-31T23:59:59Z' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('from=2024-01-01'),
      expect.any(Object),
    );
  });

  it('returns error on non-ok response', async () => {
    const { exportAuditLog } = await import('@/lib/api/audit');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    const result = await exportAuditLog();
    expect(result.ok).toBe(false);
  });
});
