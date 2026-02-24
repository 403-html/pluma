async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export interface SdkToken {
  id: string;
  name: string;
  tokenPrefix: string;
  projectId: string;
  projectName: string;
  envId: string | null;
  createdAt: string;
}

export interface CreatedToken {
  id: string;
  name: string;
  tokenPrefix: string;
  token: string;
  projectId: string;
  createdAt: string;
}

export async function listOrgTokens(): Promise<
  { ok: true; tokens: SdkToken[] } | { ok: false; message: string }
> {
  try {
    const response = await fetch('/api/v1/tokens', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load API keys');
      return { ok: false, message };
    }
    const tokens: SdkToken[] = await response.json();
    return { ok: true, tokens };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function createOrgToken(
  name: string,
  projectId: string,
  envId?: string
): Promise<{ ok: true; token: CreatedToken } | { ok: false; message: string }> {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { ok: false, message: 'Name is required' };
  }
  if (typeof projectId !== 'string' || projectId.length === 0) {
    return { ok: false, message: 'Project is required' };
  }
  try {
    const body: Record<string, string> = { name: name.trim(), projectId };
    if (envId) {
      body.envId = envId;
    }
    const response = await fetch('/api/v1/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to create API key');
      return { ok: false, message };
    }
    const token: CreatedToken = await response.json();
    return { ok: true, token };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function revokeOrgToken(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/v1/tokens/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to revoke API key');
      return { ok: false, message };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
