// Auth
export type AuthUser = {
  id: string;
  email: string;
  createdAt: Date;
};

/** Maximum email address length per RFC 5321. */
export const MAX_EMAIL_LENGTH = 320;
/** Minimum password length — enforced by both API (Zod) and client-side validation. */
export const MIN_PASSWORD_LENGTH = 8;
/** Maximum password length — enforced by both API (Zod) and client-side validation. */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Maximum nesting depth for sub-flag parent chains.
 * Enforced at the API level on flag creation and respected by the SDK
 * evaluator's bounded traversal loop.
 */
export const MAX_PARENT_DEPTH = 32;

/** Maximum project key length. */
export const MAX_PROJECT_KEY_LENGTH = 100;
/** Maximum project name length. */
export const MAX_PROJECT_NAME_LENGTH = 200;
/** Regex for a valid project key: lowercase alphanumeric segments separated by hyphens. */
export const PROJECT_KEY_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Projects
export type Project = {
  id: string;
  key: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * JSON-serialised project as returned by `GET /api/v1/projects`.
 * Extends `Project` with pre-computed environment list and flag statistics.
 */
export type ProjectSummary = Omit<Project, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  environments: Array<{ id: string; key: string; name: string }>;
};

// SDK Tokens
export type SdkToken = {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  revokedAt: Date | null;
};

// Feature Flags
export type FeatureFlag = {
  id: string;
  projectId: string;
  key: string;
  name: string;
  description: string | null;
  parentFlagId: string | null;
  createdAt: Date;
};

// Environments
export type Environment = {
  id: string;
  projectId: string;
  key: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * JSON-serialised environment as returned by `GET /api/v1/projects/:projectId/environments`.
 * Extends `Environment` with pre-computed flag statistics.
 */
export type EnvironmentSummary = Omit<Environment, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  flagStats: { enabled: number; total: number };
};

// Flag Config (per environment)
export type FlagConfig = {
  envId: string;
  flagId: string;
  enabled: boolean;
  allowList: string[];
  denyList: string[];
};

// SDK Snapshot
export type SnapshotFlag = {
  key: string;
  parentKey: string | null;
  enabled: boolean;
  inheritParent: boolean;
  allowList: string[];
  denyList: string[];
};

export type Snapshot = {
  version: number;
  projectKey: string;
  envKey: string;
  flags: SnapshotFlag[];
};

// Audit Logging
export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'enable', 'disable'] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];

export const AUDIT_ENTITY_TYPES = ['project', 'flag', 'environment', 'flagConfig', 'token'] as const;
export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[number];

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityKey?: string | null;
  projectId?: string | null;
  projectKey?: string | null;
  envId?: string | null;
  envKey?: string | null;
  flagId?: string | null;
  flagKey?: string | null;
  actorId: string;
  actorEmail: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}
