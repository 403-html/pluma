import type { ProjectSummary } from '@pluma/db';

export type { ProjectSummary };

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

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

export async function createProject(
  key: string,
  name: string
): Promise<{ ok: true; project: ProjectSummary } | { ok: false; message: string }> {
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
