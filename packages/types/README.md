# @pluma-flags/types

Shared TypeScript types and constants for the
[Pluma](https://github.com/403-html/pluma) self-hosted feature flag system. Used
by the API, web UI, and SDK.

## Install

```bash
npm install @pluma-flags/types
# or
pnpm add @pluma-flags/types
```

## Usage

```ts
import {
  type FeatureFlag,
  type FlagConfig,
  type Snapshot,
  type UserRole,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PROJECT_KEY_REGEX,
  USER_ROLES,
} from "@pluma-flags/types";

// Validate a project key
if (!PROJECT_KEY_REGEX.test(key)) {
  throw new Error("Invalid project key");
}

// Validate a password length
if (
  password.length < MIN_PASSWORD_LENGTH ||
  password.length > MAX_PASSWORD_LENGTH
) {
  throw new Error("Password out of range");
}

// Type-safe role check
const role: UserRole = "admin"; // 'operator' | 'admin' | 'user'
```

## Reference

### Constants

| Export                    | Value                                     | Description                         |
| ------------------------- | ----------------------------------------- | ----------------------------------- |
| `USER_ROLES`              | `['operator', 'admin', 'user']`           | All valid user roles                |
| `MAX_EMAIL_LENGTH`        | `320`                                     | RFC 5321 maximum email length       |
| `MIN_PASSWORD_LENGTH`     | `8`                                       | Minimum password length             |
| `MAX_PASSWORD_LENGTH`     | `128`                                     | Maximum password length             |
| `MAX_PARENT_DEPTH`        | `32`                                      | Maximum sub-flag parent chain depth |
| `MAX_PROJECT_KEY_LENGTH`  | `100`                                     | Maximum project key length          |
| `MAX_PROJECT_NAME_LENGTH` | `200`                                     | Maximum project name length         |
| `PROJECT_KEY_REGEX`       | `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`            | Valid project key pattern           |
| `AUDIT_ACTIONS`           | `['create', 'update', 'delete', ...]`     | All valid audit action values       |
| `AUDIT_ENTITY_TYPES`      | `['project', 'flag', 'environment', ...]` | All valid audit entity types        |
| `AUDIT_ACTOR_TYPES`       | `['user', 'system', 'sdk-token']`         | All valid audit actor types         |

### Types

| Export               | Description                                                                           |
| -------------------- | ------------------------------------------------------------------------------------- |
| `UserRole`           | `'operator' \| 'admin' \| 'user'`                                                     |
| `AuthUser`           | Authenticated user — `id`, `email`, `role`, `disabled`, `createdAt`                   |
| `Project`            | Project record                                                                        |
| `ProjectSummary`     | Serialised project with environments list (API response shape)                        |
| `SdkToken`           | SDK token record — `id`, `projectId`, `name`, `createdAt`, `revokedAt`                |
| `FeatureFlag`        | Flag record — `id`, `projectId`, `key`, `name`, `parentFlagId`                        |
| `Environment`        | Environment record                                                                    |
| `EnvironmentSummary` | Serialised environment with flag stats (API response shape)                           |
| `FlagConfig`         | Per-environment flag config — `enabled`, `allowList`, `denyList`, `rolloutPercentage` |
| `SnapshotFlag`       | Flag entry in an SDK snapshot                                                         |
| `Snapshot`           | Full SDK snapshot — `version`, `projectKey`, `envKey`, `flags`                        |
| `AuditMeta`          | Request metadata attached to audit log entries                                        |
| `AuditLogEntry`      | Full audit log entry record                                                           |
