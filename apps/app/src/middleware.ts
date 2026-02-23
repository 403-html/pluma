import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, isValidLocale } from '@/i18n';
import type { Locale } from '@/i18n';

if (typeof process.env.NEXT_PUBLIC_API_URL !== 'string' || process.env.NEXT_PUBLIC_API_URL.length === 0) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is required and cannot be empty');
}

const API_URL = process.env.NEXT_PUBLIC_API_URL.trim();

type RouteRule = { path: string; match: 'exact' | 'prefix' };

const PUBLIC_ROUTES: RouteRule[] = [
  { path: '/login', match: 'exact' },
  { path: '/register', match: 'exact' },
  { path: '/_next/', match: 'prefix' },
  { path: '/favicon.ico', match: 'exact' },
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((rule) =>
    rule.match === 'exact' ? pathname === rule.path : pathname.startsWith(rule.path),
  );
}

const MAX_ACCEPT_LANG_LENGTH = 256;
const MAX_LOCALE_TAGS = 10;

function detectLocale(request: NextRequest): Locale {
  const raw = request.headers.get('accept-language') ?? '';
  const acceptLang = raw.slice(0, MAX_ACCEPT_LANG_LENGTH);
  const tags = acceptLang.split(',').slice(0, MAX_LOCALE_TAGS);
  for (const tag of tags) {
    const code = tag.split(';')[0].trim().split('-')[0].toLowerCase();
    if (isValidLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
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

  // Determine the locale from the first path segment.
  const firstSegment = pathname.split('/')[1] ?? '';

  if (!isValidLocale(firstSegment)) {
    // No valid locale prefix — detect from Accept-Language and redirect.
    const locale = detectLocale(request);
    const redirectUrl = new URL(`/${locale}${pathname}`, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  const locale: Locale = firstSegment;
  // Strip the locale prefix to get the logical path used for route matching.
  const pathParts = pathname.split('/').slice(2);
  const localePath = ('/' + pathParts.join('/')).replace(/\/+$/, '') || '/';

  if (isPublicPath(localePath)) {
    return NextResponse.next();
  }

  const isAuthenticated = await checkAuth(request);
  if (isAuthenticated) {
    return NextResponse.next();
  }

  const isConfigured = await checkSetup();
  if (!isConfigured) {
    return NextResponse.redirect(new URL(`/${locale}/register`, request.url));
  }

  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('returnUrl', localePath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|sdk/).*)'],
};
