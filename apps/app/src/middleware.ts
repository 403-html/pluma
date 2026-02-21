import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RouteRule = { path: string; match: 'exact' | 'prefix' };

const PUBLIC_ROUTES: RouteRule[] = [
  { path: '/login', match: 'exact' },
  { path: '/register', match: 'exact' },
  { path: '/api/', match: 'prefix' },
  { path: '/sdk/', match: 'prefix' },
  { path: '/_next/', match: 'prefix' },
  { path: '/favicon.ico', match: 'exact' },
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((rule) =>
    rule.match === 'exact' ? pathname === rule.path : pathname.startsWith(rule.path),
  );
}

async function checkSetup(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/setup`);
    if (response.status === 404) return false;
    if (!response.ok) return true;
    const data = await response.json();
    if (typeof data !== 'object' || data === null) return true;
    if (typeof data.configured !== 'boolean') return true;
    return data.configured;
  } catch {
    return true;
  }
}

async function checkAuth(request: NextRequest): Promise<boolean> {
  try {
    const cookie = request.cookies.get('pluma_session')?.value;
    if (typeof cookie !== 'string' || cookie.length === 0) return false;

    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Cookie: `pluma_session=${cookie}` },
    });
    if (!response.ok) return false;

    const data = await response.json();
    if (typeof data !== 'object' || data === null) return false;
    if (typeof data.id !== 'string' || typeof data.email !== 'string') return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isAuthenticated = await checkAuth(request);
  if (isAuthenticated) {
    return NextResponse.next();
  }

  const isConfigured = await checkSetup();
  if (!isConfigured) {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
