import { type NextRequest, NextResponse } from 'next/server';

// 10 MB cap to prevent unbounded memory growth from large request bodies.
const MAX_BODY_BYTES = 10 * 1024 * 1024;

// 30 s matches a typical API gateway / load-balancer timeout and provides
// a reasonable upper bound before surfacing a 502 to the browser.
const UPSTREAM_TIMEOUT_MS = 30_000;

const STRIPPED_REQ_HEADERS: ReadonlySet<string> = new Set([
  'host',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
  'connection',
]);

// transfer-encoding and connection are hop-by-hop headers not valid for fetch responses.
const STRIPPED_RES_HEADERS: ReadonlySet<string> = new Set([
  'transfer-encoding',
  'connection',
]);

// HTTP methods that carry a request body.
const METHODS_WITH_BODY: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type ProxyContext = { params: Promise<{ path: string[] }> };

/**
 * Forwards a Next.js request to the upstream API server and streams the response back.
 * Reads API_URL at request time so it can be injected at container runtime.
 */
export async function createProxyHandler(
  request: NextRequest,
  context: ProxyContext,
  prefix: string,
): Promise<NextResponse> {
  const apiUrl = process.env.API_URL;
  if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
    return NextResponse.json({ error: 'API not configured' }, { status: 502 });
  }

  await context.params;
  const requestPathname = request.nextUrl.pathname.replace(/^\/+/, '');
  const upstreamPath = `${requestPathname}${request.nextUrl.search}`;
  const target = new URL(upstreamPath, apiUrl);

  const reqHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQ_HEADERS.has(key.toLowerCase())) {
      reqHeaders.set(key, value);
    }
  });

  let body: ArrayBuffer | undefined;
  if (METHODS_WITH_BODY.has(request.method)) {
    const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: request.method,
      headers: reqHeaders,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[proxy] upstream fetch failed', err);
    return NextResponse.json({ error: 'Bad gateway' }, { status: 502 });
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RES_HEADERS.has(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}
