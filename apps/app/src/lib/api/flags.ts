import type { FeatureFlag } from '@pluma/types';
import { validateKey, validateName } from '@/lib/validation';
import { parseErrorMessage } from './utils';

export type { FeatureFlag };

export type FlagEntry = {
  flagId: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  allowList: string[];
  denyList: string[];
  rolloutPercentage: number | null;  // null = not configured
  parentFlagId: string | null;
};

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
  description?: string,
  parentFlagId?: string
): Promise<{ ok: true; flag: FeatureFlag } | { ok: false; message: string }> {
  const keyError = validateKey(key);
  if (keyError) return keyError;
  const nameError = validateName(name);
  if (nameError) return nameError;
  try {
    const body: { key: string; name: string; description?: string; parentFlagId?: string } = { key, name };
    if (description !== undefined && description.length > 0) {
      body.description = description;
    }
    if (parentFlagId !== undefined) {
      body.parentFlagId = parentFlagId;
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
    const keyError = validateKey(data.key);
    if (keyError) return keyError;
  }
  if (data.name !== undefined) {
    const nameError = validateName(data.name);
    if (nameError) return nameError;
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

export async function updateFlagConfig(
  envId: string,
  flagId: string,
  data: { enabled?: boolean; allowList?: string[]; denyList?: string[]; rolloutPercentage?: number | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  if (Object.keys(cleaned).length === 0) {
    return { ok: false, message: 'At least one of enabled, allowList, denyList, or rolloutPercentage must be provided.' };
  }
  try {
    const response = await fetch(`/api/v1/environments/${envId}/flags/${flagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaned),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to update flag targeting');
      return { ok: false, message };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
