export type HelloWorldMessage = {
  message: "hello world";
};

export const HELLO_WORLD: HelloWorldMessage = {
  message: "hello world",
};

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
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// SDK Snapshot
export type FlagSnapshot = {
  projectId: string;
  flags: Array<{ key: string; enabled: boolean }>;
};
