import { createHash } from 'crypto';

// ── Stable IDs ────────────────────────────────────────────────────────────────
export const USER_ID          = '11111111-1111-4111-8111-111111111111';
export const PROJECT_ID       = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const OTHER_PROJECT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const ENV_ID           = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const FLAG_ID          = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const TOKEN_ID         = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// ── Session / auth ─────────────────────────────────────────────────────────────
export const SESSION_TOKEN = 'test-session-token';
export const AUTH_COOKIE   = `pluma_session=${SESSION_TOKEN}`;

// ── SDK token ──────────────────────────────────────────────────────────────────
export const RAW_SDK_TOKEN  = 'pluma_sdk_' + 'a'.repeat(64);
export const SDK_TOKEN_HASH = createHash('sha256').update(RAW_SDK_TOKEN).digest('hex');

// ── Fixed timestamp (avoids flaky time-dependent assertions) ───────────────────
export const FIXED_DATE = new Date('2025-01-01T00:00:00.000Z');

// ── Mock entities ──────────────────────────────────────────────────────────────
export const mockUser = {
  id: USER_ID,
  email: 'admin@example.com',
  passwordHash: 'hash',
  createdAt: FIXED_DATE,
};

export const mockSession = {
  id: '00000000-0000-4000-8000-000000000000',
  token: SESSION_TOKEN,
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  userId: USER_ID,
  createdAt: FIXED_DATE,
  user: mockUser,
};

export const mockProject = {
  id: PROJECT_ID,
  key: 'test-project',
  name: 'Test Project',
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
};

export const mockEnvironment = {
  id: ENV_ID,
  projectId: PROJECT_ID,
  key: 'staging',
  name: 'Staging',
  configVersion: 0,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
};

export const mockEnvironmentWithProject = {
  ...mockEnvironment,
  project: mockProject,
};

export const mockFlag = {
  id: FLAG_ID,
  projectId: PROJECT_ID,
  key: 'dark-mode',
  name: 'Dark Mode',
  description: null as string | null,
  parentFlagId: null as string | null,
  createdAt: FIXED_DATE,
};

export const mockFlagConfig = {
  envId: ENV_ID,
  flagId: FLAG_ID,
  enabled: true,
  allowList: [] as string[],
  denyList: [] as string[],
  rolloutPercentage: null,
};

export const mockSdkToken = {
  id: TOKEN_ID,
  projectId: PROJECT_ID,
  envId: ENV_ID,
  name: 'CI Token',
  tokenHash: SDK_TOKEN_HASH,
  createdAt: FIXED_DATE,
  revokedAt: null as Date | null,
};
