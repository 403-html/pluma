/**
 * Tests for apps/app/src/lib/api.ts
 *
 * Runs in a Node environment with `fetch` and `window` stubbed.
 * Uses plain mock objects (not real Response) to avoid browser-specific
 * constraints (204 rejection, single-read body).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mock response helpers ---
type MockResp = { ok: boolean; status: number; statusText: string; text: () => Promise<string> };

const mockOk   = (body: unknown): MockResp => ({ ok: true,  status: 200, statusText: 'OK',    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body)) });
const mockEmpty = (status: number): MockResp => ({ ok: true,  status,     statusText: '',       text: () => Promise.resolve('') });
const mockErr  = (status: number, msg = ''): MockResp => ({ ok: false, status,     statusText: 'Error', text: () => Promise.resolve(msg) });

// Stub window = undefined so api.ts uses the server-side code path.
vi.stubGlobal('window', undefined);
process.env['NEXT_PUBLIC_API_URL'] = 'http://test-api';

// Import AFTER stubbing so API_URL captures the env-var path.
const { auth, projects, environments, flags, ApiError } = await import('./api.js');

// ─── fetchApi core ─────────────────────────────────────────────────────────

describe('fetchApi', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns parsed JSON on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk({ id: '1', email: 'a@b.com', createdAt: '' })));
    const u = await auth.me();
    expect(u.email).toBe('a@b.com');
  });

  it('throws ApiError on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockErr(404, 'Not found')));
    await expect(auth.me()).rejects.toBeInstanceOf(ApiError);
  });

  it('ApiError.status matches HTTP status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockErr(401, 'Unauthorized')));
    const err = await auth.me().catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
  });

  it('returns undefined for 204 (empty body)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockEmpty(204)));
    await expect(auth.logout()).resolves.toBeUndefined();
  });

  it('returns undefined for 200 with empty body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockEmpty(200)));
    await expect(auth.logout()).resolves.toBeUndefined();
  });

  it('sends credentials: include', async () => {
    const f = vi.fn().mockResolvedValue(mockOk([]));
    vi.stubGlobal('fetch', f);
    await projects.list();
    expect(f).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ credentials: 'include' }));
  });

  it('sends Content-Type: application/json', async () => {
    const f = vi.fn().mockResolvedValue(mockOk([]));
    vi.stubGlobal('fetch', f);
    await projects.list();
    expect(f).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }));
  });
});

// ─── auth ─────────────────────────────────────────────────────────────────

describe('auth.login', () => {
  it('POSTs credentials to /v1/auth/login', async () => {
    const f = vi.fn().mockResolvedValue(mockOk({ id: '1', email: 'u@t.com', createdAt: '' }));
    vi.stubGlobal('fetch', f);
    await auth.login('u@t.com', 'pass');
    expect(f).toHaveBeenCalledWith('http://test-api/v1/auth/login', expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'u@t.com', password: 'pass' }) }));
  });
});

describe('auth.register', () => {
  it('POSTs to /v1/auth/register and returns undefined', async () => {
    const f = vi.fn().mockResolvedValue(mockEmpty(204));
    vi.stubGlobal('fetch', f);
    await expect(auth.register('u@t.com', 'pass')).resolves.toBeUndefined();
    expect(f).toHaveBeenCalledWith('http://test-api/v1/auth/register', expect.objectContaining({ method: 'POST' }));
  });
});

// ─── projects ─────────────────────────────────────────────────────────────

describe('projects.list', () => {
  it('GETs /v1/projects', async () => {
    const f = vi.fn().mockResolvedValue(mockOk([{ id: '1', key: 'p1', name: 'P1', createdAt: '', updatedAt: '' }]));
    vi.stubGlobal('fetch', f);
    const res = await projects.list();
    expect(res[0].key).toBe('p1');
  });
});

describe('projects.create', () => {
  it('POSTs key+name to /v1/projects', async () => {
    const f = vi.fn().mockResolvedValue(mockOk({ id: '2', key: 'a', name: 'A', createdAt: '', updatedAt: '' }));
    vi.stubGlobal('fetch', f);
    await projects.create('a', 'A');
    expect(f).toHaveBeenCalledWith('http://test-api/v1/projects', expect.objectContaining({ method: 'POST', body: JSON.stringify({ key: 'a', name: 'A' }) }));
  });
});

describe('projects.delete', () => {
  it('DELETEs /v1/projects/:id and returns undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockEmpty(204)));
    await expect(projects.delete('x')).resolves.toBeUndefined();
  });
});

// ─── environments ─────────────────────────────────────────────────────────

describe('environments.list', () => {
  it('GETs /v1/projects/:projectId/environments', async () => {
    const f = vi.fn().mockResolvedValue(mockOk([]));
    vi.stubGlobal('fetch', f);
    await environments.list('proj-1');
    expect(f).toHaveBeenCalledWith('http://test-api/v1/projects/proj-1/environments', expect.any(Object));
  });
});

// ─── flags.list (pagination) ──────────────────────────────────────────────

describe('flags.list', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns items from a single page', async () => {
    const p1 = { data: [{ flagId: 'f1', key: 'flag-a', name: 'A', description: null, enabled: true }], nextCursor: null };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(p1)));
    const res = await flags.list('env-1');
    expect(res).toHaveLength(1);
    expect(res[0].key).toBe('flag-a');
  });

  it('follows nextCursor across multiple pages', async () => {
    const p1 = { data: [{ flagId: 'f1', key: 'a', name: 'A', description: null, enabled: true }],  nextCursor: 'c2' };
    const p2 = { data: [{ flagId: 'f2', key: 'b', name: 'B', description: null, enabled: false }], nextCursor: null };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOk(p1)).mockResolvedValueOnce(mockOk(p2)));
    const res = await flags.list('env-1');
    expect(res.map((f) => f.key)).toEqual(['a', 'b']);
  });

  it('stops at MAX_FLAG_PAGES=10 even with endless cursors', async () => {
    const page = { data: [{ flagId: 'fx', key: 'x', name: 'X', description: null, enabled: true }], nextCursor: 'always' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(page)));
    const res = await flags.list('env-x');
    expect(res.length).toBeLessThanOrEqual(10);
  });
});
