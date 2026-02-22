import type { EnvironmentSummary } from '@pluma/types';
import { MAX_PROJECT_KEY_LENGTH, MAX_PROJECT_NAME_LENGTH } from '@pluma/types';

export type { EnvironmentSummary };

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export async function listEnvironments(projectId: string): Promise<
  { ok: true; environments: EnvironmentSummary[] } | { ok: false; message: string }
> {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}/environments`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load environments');
      return { ok: false, message };
    }

    const environments: EnvironmentSummary[] = await response.json();
    return { ok: true, environments };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function createEnvironment(
  projectId: string,
  key: string,
  name: string
): Promise<{ ok: true; environment: EnvironmentSummary } | { ok: false; message: string }> {
  if (typeof key !== 'string' || key.length === 0) {
    return { ok: false, message: 'Key is required' };
  }
  if (key.length > MAX_PROJECT_KEY_LENGTH) {
    return { ok: false, message: `Key must be ${MAX_PROJECT_KEY_LENGTH} characters or fewer` };
  }
  if (typeof name !== 'string' || name.length === 0) {
    return { ok: false, message: 'Name is required' };
  }
  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return { ok: false, message: `Name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer` };
  }
  try {
    const response = await fetch(`/api/v1/projects/${projectId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to create environment');
      return { ok: false, message };
    }

    const environment: EnvironmentSummary = await response.json();
    return { ok: true, environment };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function updateEnvironment(
  envId: string,
  data: { key?: string; name?: string }
): Promise<{ ok: true; environment: EnvironmentSummary } | { ok: false; message: string }> {
  if (data.key === undefined && data.name === undefined) {
    return { ok: false, message: 'Provide a valid key or name to update' };
  }
  if (data.key !== undefined) {
    const keyLength = data.key.length;
    if (keyLength === 0) {
      return { ok: false, message: 'Key is required' };
    }
    if (keyLength > MAX_PROJECT_KEY_LENGTH) {
      return {
        ok: false,
        message: `Key must be ${MAX_PROJECT_KEY_LENGTH} characters or fewer`,
      };
    }
  }
  if (data.name !== undefined) {
    const nameLength = data.name.length;
    if (nameLength === 0) {
      return { ok: false, message: 'Name is required' };
    }
    if (nameLength > MAX_PROJECT_NAME_LENGTH) {
      return {
        ok: false,
        message: `Name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer`,
      };
    }
  }
  try {
    const response = await fetch(`/api/v1/environments/${envId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to update environment');
      return { ok: false, message };
    }

    const environment: EnvironmentSummary = await response.json();
    return { ok: true, environment };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function deleteEnvironment(
  envId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/v1/environments/${envId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to delete environment');
      return { ok: false, message };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
