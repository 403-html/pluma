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

/**
 * Reads the request body in chunks, aborting as soon as the cumulative size
 * exceeds maxBytes. Returns null when the limit is exceeded so the caller
 * can return a 413 without having buffered the full oversized payload.
 * The loop is bounded: at MAX_BODY_BYTES / chunk_size iterations at most.
 */
async function readBodyWithLimit(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<ArrayBuffer | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined.buffer;
}

/**
 * Forwards a Next.js request to the upstream API server and streams the response back.
 * Reads API_URL at request time so it can be injected at container runtime.
 */
export async function createProxyHandler(request: NextRequest): Promise<NextResponse> {
  const apiUrl = process.env.API_URL;
  if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
    return NextResponse.json({ error: 'API not configured' }, { status: 502 });
  }

  // Derive the upstream URL from the request pathname to preserve percent-encoding.
  const target = new URL(request.nextUrl.pathname, apiUrl);
  target.search = request.nextUrl.search;

  const reqHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQ_HEADERS.has(key.toLowerCase())) {
      reqHeaders.set(key, value);
    }
  });

  let body: ArrayBuffer | undefined;
  if (METHODS_WITH_BODY.has(request.method) && request.body) {
    // Reject known-large bodies immediately before reading any bytes.
    const contentLength = parseInt(request.headers.get('content-length') ?? '', 10);
    if (!isNaN(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
    // Stream the body in chunks so we abort as soon as MAX_BODY_BYTES is exceeded
    // rather than buffering the entire oversized payload first.
    const buf = await readBodyWithLimit(request.body, MAX_BODY_BYTES);
    if (buf === null) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
    body = buf;
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
