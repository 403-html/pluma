import type { FeatureFlag } from '@pluma/types';
import { MAX_PROJECT_KEY_LENGTH, MAX_PROJECT_NAME_LENGTH } from '@pluma/types';

export type { FeatureFlag };

export type FlagEntry = {
  flagId: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
};

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export async function listFlagsForEnvironment(envId: string): Promise<
  { ok: true; flags: FlagEntry[]; nextCursor: string | null } | { ok: false; message: string }
> {
  try {
    const response = await fetch(`/api/v1/environments/${envId}/flags`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load flags');
      return { ok: false, message };
    }

    const result = await response.json();
    return { ok: true, flags: result.data, nextCursor: result.nextCursor };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function createFlag(
  projectId: string,
  key: string,
  name: string,
  description?: string
): Promise<{ ok: true; flag: FeatureFlag } | { ok: false; message: string }> {
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
    const body: { key: string; name: string; description?: string } = { key, name };
    if (description !== undefined && description.length > 0) {
      body.description = description;
    }

    const response = await fetch(`/api/v1/projects/${projectId}/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to create flag');
      return { ok: false, message };
    }

    const flag: FeatureFlag = await response.json();
    return { ok: true, flag };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function updateFlag(
  flagId: string,
  data: { key?: string; name?: string; description?: string | null }
): Promise<{ ok: true; flag: FeatureFlag } | { ok: false; message: string }> {
  if (data.key === undefined && data.name === undefined && data.description === undefined) {
    return { ok: false, message: 'Provide a valid key, name, or description to update' };
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
    const response = await fetch(`/api/v1/flags/${flagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to update flag');
      return { ok: false, message };
    }

    const flag: FeatureFlag = await response.json();
    return { ok: true, flag };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function deleteFlag(
  flagId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/v1/flags/${flagId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to delete flag');
      return { ok: false, message };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function toggleFlagEnabled(
  envId: string,
  flagId: string,
  enabled: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/v1/environments/${envId}/flags/${flagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to toggle flag');
      return { ok: false, message };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
