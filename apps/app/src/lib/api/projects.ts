import type { ProjectSummary } from '@pluma/types';

export type { ProjectSummary };

import { validateKey, validateName } from '@/lib/validation';
import { parseErrorMessage } from './utils';

export async function listProjects(): Promise<
  { ok: true; projects: ProjectSummary[] } | { ok: false; message: string }
> {
  try {
    const response = await fetch('/api/v1/projects', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load projects');
      return { ok: false, message };
    }

    const projects: ProjectSummary[] = await response.json();
    return { ok: true, projects };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function getProject(
  id: string
): Promise<{ ok: true; project: ProjectSummary } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/v1/projects/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load project');
      return { ok: false, message };
    }

    const project: ProjectSummary = await response.json();
    return { ok: true, project };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function createProject(
  key: string,
  name: string
): Promise<{ ok: true; project: ProjectSummary } | { ok: false; message: string }> {
  const keyError = validateKey(key);
  if (keyError) return keyError;
  const nameError = validateName(name);
  if (nameError) return nameError;
  try {
    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to create project');
      return { ok: false, message };
    }

    const project: ProjectSummary = await response.json();
    return { ok: true, project };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function updateProject(
  id: string,
  data: { key?: string; name?: string }
): Promise<{ ok: true; project: ProjectSummary } | { ok: false; message: string }> {
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
    const response = await fetch(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to update project');
      return { ok: false, message };
    }

    const project: ProjectSummary = await response.json();
    return { ok: true, project };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

export async function deleteProject(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/v1/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to delete project');
      return { ok: false, message };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
