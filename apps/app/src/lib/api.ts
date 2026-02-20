import type {
  AuthUser,
  Project,
  Environment,
  FeatureFlag,
  FlagConfig,
} from '@pluma/types';
import { DEFAULT_API_URL } from './constants';

/**
 * API URL for client-side requests. On the client, uses the Next.js rewrite
 * at /api which proxies to the backend. On the server, uses the direct URL.
 */
const API_URL =
  typeof window !== 'undefined'
    ? '/api'
    : process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
  }

  return response.json() as Promise<T>;
}

// Auth
export const auth = {
  async login(email: string, password: string): Promise<AuthUser> {
    return fetchApi<AuthUser>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email: string, password: string): Promise<void> {
    return fetchApi<void>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async me(): Promise<AuthUser> {
    return fetchApi<AuthUser>('/api/v1/auth/me');
  },

  async logout(): Promise<void> {
    return fetchApi<void>('/api/v1/auth/logout', { method: 'POST' });
  },
};

// Projects
export const projects = {
  async list(): Promise<Project[]> {
    return fetchApi<Project[]>('/api/v1/projects');
  },

  async create(key: string, name: string): Promise<Project> {
    return fetchApi<Project>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ key, name }),
    });
  },

  async update(id: string, data: { name?: string }): Promise<Project> {
    return fetchApi<Project>(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return fetchApi<void>(`/api/v1/projects/${id}`, { method: 'DELETE' });
  },
};

// Environments
export const environments = {
  async list(projectId: string): Promise<Environment[]> {
    return fetchApi<Environment[]>(
      `/api/v1/projects/${projectId}/environments`,
    );
  },

  async create(
    projectId: string,
    key: string,
    name: string,
  ): Promise<Environment> {
    return fetchApi<Environment>(`/api/v1/projects/${projectId}/environments`, {
      method: 'POST',
      body: JSON.stringify({ key, name }),
    });
  },

  async update(envId: string, data: { name?: string }): Promise<Environment> {
    return fetchApi<Environment>(`/api/v1/environments/${envId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(envId: string): Promise<void> {
    return fetchApi<void>(`/api/v1/environments/${envId}`, {
      method: 'DELETE',
    });
  },
};

// Flags
type FlagWithConfig = FeatureFlag & { config: FlagConfig };

/** Shape returned by GET /api/v1/environments/:envId/flags */
export type FlagListItem = {
  flagId: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
};

type FlagListResponse = {
  data: FlagListItem[];
  nextCursor: string | null;
};

export const flags = {
  async list(envId: string): Promise<FlagListItem[]> {
    const res = await fetchApi<FlagListResponse>(
      `/api/v1/environments/${envId}/flags`,
    );
    return res.data;
  },

  async create(
    projectId: string,
    key: string,
    name: string,
    description?: string,
  ): Promise<FeatureFlag> {
    return fetchApi<FeatureFlag>(`/api/v1/projects/${projectId}/flags`, {
      method: 'POST',
      body: JSON.stringify({ key, name, description }),
    });
  },

  async update(
    flagId: string,
    data: { name?: string; description?: string },
  ): Promise<FeatureFlag> {
    return fetchApi<FeatureFlag>(`/api/v1/flags/${flagId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(flagId: string): Promise<void> {
    return fetchApi<void>(`/api/v1/flags/${flagId}`, { method: 'DELETE' });
  },

  async updateConfig(
    envId: string,
    flagId: string,
    data: { enabled?: boolean },
  ): Promise<FlagConfig> {
    return fetchApi<FlagConfig>(
      `/api/v1/environments/${envId}/flags/${flagId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  },
};

export { ApiError };
export type { FlagWithConfig };
