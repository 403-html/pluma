// Auth
export type AuthUser = {
  id: string;
  email: string;
  createdAt: Date;
};

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
};

// SDK Snapshot
export type SnapshotFlag = {
  key: string;
  parentKey: string | null;
  enabled: boolean;
  inheritParent: boolean;
};

export type Snapshot = {
  version: number;
  projectKey: string;
  envKey: string;
  flags: SnapshotFlag[];
};
