import type { AuthUser } from '@pluma/types';
import { MIN_PASSWORD_LENGTH } from '@pluma/types';
import type { Locale } from '@/i18n';
import { getDictionary } from '@/i18n';
import { validateEmail, validatePassword } from '@/lib/validation';
import { parseErrorMessage } from './utils';

/**
 * Serialized API response shape — `createdAt` is a JSON string, not a `Date`.
 * Derived from the shared `AuthUser` type to stay in sync.
 */
export type AuthUserResponse = Omit<AuthUser, 'createdAt'> & { createdAt: string };

export type AuthResult =
  | { ok: true; user: AuthUserResponse }
  | { ok: false; message: string; status: number };


export async function login(email: string, password: string, locale: Locale): Promise<AuthResult> {
  const t = getDictionary(locale);
  if (validateEmail(email)) {
    return { ok: false, message: t.login.errorFallback, status: 400 };
  }
  if (validatePassword(password)) {
    return { ok: false, message: t.login.errorFallback, status: 400 };
  }
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

export async function register(email: string, password: string, locale: Locale): Promise<AuthResult> {
  const t = getDictionary(locale);
  if (validateEmail(email)) {
    return { ok: false, message: t.register.errorFallback, status: 400 };
  }
  if (validatePassword(password)) {
    return { ok: false, message: t.register.errorFallback, status: 400 };
  }
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

export async function logout(locale: Locale): Promise<{ ok: boolean; message?: string }> {
  const t = getDictionary(locale);
  try {
    const response = await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      return { ok: false, message: t.errors.logoutFailed };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: t.errors.networkError };
  }
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  locale: Locale
): Promise<{ ok: boolean; message?: string }> {
  const t = getDictionary(locale);
  if (validatePassword(oldPassword)) {
    return { ok: false, message: t.settings.oldPasswordInvalid };
  }
  if (validatePassword(newPassword)) {
    return { ok: false, message: t.settings.newPasswordInvalid };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: t.settings.newPasswordTooShort };
  }
  try {
    const response = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, t.settings.changePasswordError);
      return { ok: false, message };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: t.errors.networkError };
  }
}

/**
 * Server-side only: verifies the current session by calling GET /api/v1/auth/me
 * with a forwarded Cookie header. Requires NEXT_PUBLIC_API_URL to be set.
 */
export async function checkSession(cookieHeader: string): Promise<boolean> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.error('[checkSession] NEXT_PUBLIC_API_URL is not set');
    return false;
  }
  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    });
    return response.ok;
  } catch (error) {
    console.error('[checkSession] failed', error);
    return false;
  }
}
