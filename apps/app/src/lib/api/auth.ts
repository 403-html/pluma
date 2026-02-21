import type { AuthUser } from '@pluma/types';

/**
 * Serialized API response shape — `createdAt` is a JSON string, not a `Date`.
 * Derived from the shared `AuthUser` type to stay in sync.
 */
export type AuthUserResponse = Omit<AuthUser, 'createdAt'> & { createdAt: string };

export type AuthResult =
  | { ok: true; user: AuthUserResponse }
  | { ok: false; message: string; status: number };

/** HTTP Conflict status code — returned by /register when an admin already exists. */
export const HTTP_CONFLICT = 409;

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Login failed');
      return { ok: false, message, status: response.status };
    }

    const user: AuthUserResponse = await response.json();
    return { ok: true, user };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.', status: 0 };
  }
}

export async function register(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Registration failed');
      return { ok: false, message, status: response.status };
    }

    const user: AuthUserResponse = await response.json();
    return { ok: true, user };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.', status: 0 };
  }
}
