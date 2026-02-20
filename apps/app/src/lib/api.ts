import type {
  AuthUser,
  Project,
  Environment,
  FeatureFlag,
  FlagConfig,
  FlagListItem,
  FlagListResponse,
} from '@pluma/types';

/**
 * API URL for client-side requests. On the client, uses the Next.js rewrite
 * at /api which proxies to the backend. On the server, uses the env variable.
 */
const API_URL =
  typeof window !== 'undefined'
    ? '/api'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  // 204 No Content and other empty bodies (e.g. DELETE, logout)
  if (response.status === 204) {
    return undefined as T;
  }
  const bodyText = await response.text();
  if (!bodyText) {
    return undefined as T;
  }
  return JSON.parse(bodyText) as T;
}

// Auth
export const auth = {
  async login(email: string, password: string): Promise<AuthUser> {
    return fetchApi<AuthUser>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email: string, password: string): Promise<void> {
    return fetchApi<void>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async me(): Promise<AuthUser> {
    return fetchApi<AuthUser>('/v1/auth/me');
  },

  async logout(): Promise<void> {
    return fetchApi<void>('/v1/auth/logout', { method: 'POST' });
  },
};

// Projects
export const projects = {
  async list(): Promise<Project[]> {
    return fetchApi<Project[]>('/v1/projects');
  },

  async create(key: string, name: string): Promise<Project> {
    return fetchApi<Project>('/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ key, name }),
    });
  },

  async update(id: string, data: { name?: string }): Promise<Project> {
    return fetchApi<Project>(`/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return fetchApi<void>(`/v1/projects/${id}`, { method: 'DELETE' });
  },
};

// Environments
export const environments = {
  async list(projectId: string): Promise<Environment[]> {
    return fetchApi<Environment[]>(
      `/v1/projects/${projectId}/environments`,
    );
  },

  async create(
    projectId: string,
    key: string,
    name: string,
  ): Promise<Environment> {
    return fetchApi<Environment>(`/v1/projects/${projectId}/environments`, {
      method: 'POST',
      body: JSON.stringify({ key, name }),
    });
  },

  async update(envId: string, data: { name?: string }): Promise<Environment> {
    return fetchApi<Environment>(`/v1/environments/${envId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(envId: string): Promise<void> {
    return fetchApi<void>(`/v1/environments/${envId}`, {
      method: 'DELETE',
    });
  },
};

// Flags

export const flags = {
  async list(envId: string): Promise<FlagListItem[]> {
    const MAX_FLAG_PAGES = 10;
    const allFlags: FlagListItem[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_FLAG_PAGES; page++) {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const res = await fetchApi<FlagListResponse>(
        `/v1/environments/${envId}/flags${query}`,
      );
      allFlags.push(...res.data);
      if (!res.nextCursor) break;
      cursor = res.nextCursor;
    }

    return allFlags;
  },

  async create(
    projectId: string,
    key: string,
    name: string,
    description?: string,
    parentFlagId?: string,
  ): Promise<FeatureFlag> {
    return fetchApi<FeatureFlag>(`/v1/projects/${projectId}/flags`, {
      method: 'POST',
      body: JSON.stringify({ key, name, description, parentFlagId }),
    });
  },

  async update(
    flagId: string,
    data: { name?: string; description?: string },
  ): Promise<FeatureFlag> {
    return fetchApi<FeatureFlag>(`/v1/flags/${flagId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(flagId: string): Promise<void> {
    return fetchApi<void>(`/v1/flags/${flagId}`, { method: 'DELETE' });
  },

  async updateConfig(
    envId: string,
    flagId: string,
    data: { enabled?: boolean },
  ): Promise<FlagConfig> {
    return fetchApi<FlagConfig>(
      `/v1/environments/${envId}/flags/${flagId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  },
};

export { ApiError };
export type { FlagListItem, FlagListResponse };
