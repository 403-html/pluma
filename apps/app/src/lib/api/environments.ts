import type { EnvironmentSummary } from '@pluma/types';

export type { EnvironmentSummary };

import { validateKey, validateName } from '@/lib/validation';
import { parseErrorMessage } from './utils';

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
  const keyError = validateKey(key);
  if (keyError) return keyError;
  const nameError = validateName(name);
  if (nameError) return nameError;
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
    const keyError = validateKey(data.key);
    if (keyError) return keyError;
  }
  if (data.name !== undefined) {
    const nameError = validateName(data.name);
    if (nameError) return nameError;
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
