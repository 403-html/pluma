export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response, 'Login failed');
    return { ok: false, message };
  }

  const user: AuthUser = await response.json();
  return { ok: true, user };
}

export async function register(email: string, password: string): Promise<AuthResult> {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response, 'Registration failed');
    return { ok: false, message };
  }

  const user: AuthUser = await response.json();
  return { ok: true, user };
}
