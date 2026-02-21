import type { AuthUser } from '@pluma/types';
import { getDictionary, DEFAULT_LOCALE } from '@/i18n';

/**
 * Serialized API response shape — `createdAt` is a JSON string, not a `Date`.
 * Derived from the shared `AuthUser` type to stay in sync.
 */
export type AuthUserResponse = Omit<AuthUser, 'createdAt'> & { createdAt: string };

export type AuthResult =
  | { ok: true; user: AuthUserResponse }
  | { ok: false; message: string; status: number };


async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const t = getDictionary(DEFAULT_LOCALE);
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, t.login.errorFallback);
      return { ok: false, message, status: response.status };
    }

    const user: AuthUserResponse = await response.json();
    return { ok: true, user };
  } catch {
    return { ok: false, message: t.errors.networkError, status: 0 };
  }
}

export async function register(email: string, password: string): Promise<AuthResult> {
  const t = getDictionary(DEFAULT_LOCALE);
  try {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, t.register.errorFallback);
      return { ok: false, message, status: response.status };
    }

    const user: AuthUserResponse = await response.json();
    return { ok: true, user };
  } catch {
    return { ok: false, message: t.errors.networkError, status: 0 };
  }
}
