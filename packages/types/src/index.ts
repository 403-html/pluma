// Auth
export type AuthUser = {
  id: string;
  email: string;
  createdAt: Date;
};

/**
 * Maximum nesting depth for sub-flag parent chains.
 * Enforced at the API level on flag creation and respected by the SDK
 * evaluator's bounded traversal loop.
 */
export const MAX_PARENT_DEPTH = 32;

// Projects
export type Project = {
  id: string;
  key: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
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
