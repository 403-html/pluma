import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/register'];
const STATIC_PATHS = ['/api/', '/sdk/', '/_next/', '/favicon.ico'];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    STATIC_PATHS.some((path) => pathname.startsWith(path))
  );
}

async function checkSetup(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/setup`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return data.configured === true;
  } catch {
    return false;
  }
}

async function checkAuth(request: NextRequest): Promise<boolean> {
  try {
    const cookie = request.cookies.get('pluma_session')?.value;
    if (!cookie) return false;

    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pluma_session=${cookie}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isConfigured = await checkSetup();
  if (!isConfigured) {
    return NextResponse.redirect(new URL('/register', request.url));
  }

  const isAuthenticated = await checkAuth(request);
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
