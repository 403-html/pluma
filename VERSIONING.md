# Versioning

## Overview

Pluma is a monorepo with multiple independently versioned packages. Each
published package and deployable artifact follows its own release cadence while
sharing a common Semantic Versioning contract.

## Semver Adherence

Pluma follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)
for all externally consumed packages and Docker images:

- **Major** — incompatible API or contract changes
- **Minor** — backward-compatible functionality additions
- **Patch** — backward-compatible bug fixes

## Package Versioning

| Package              | Registry | Tag pattern    | Notes                                                |
| -------------------- | -------- | -------------- | ---------------------------------------------------- |
| `@pluma-flags/sdk`   | npm      | `sdk/v*.*.*`   | Independent version; depends on `@pluma-flags/types` |
| `@pluma-flags/types` | npm      | `types/v*.*.*` | Independent version                                  |
| Docker (API + App)   | ghcr.io  | `v*.*.*`       | API and App share one version and release together   |

- **SDK and Types** are versioned independently on npm. A new Types release does
  not require an SDK release (and vice-versa) unless there is a dependency
  change.
- **Docker images** (`pluma-api` and `pluma-app`) always share a single version.
  A Docker release is one atomic unit that includes the API server, the web UI,
  and any pending database migrations.
- **Internal packages** (`@pluma-flags/db`, `@pluma-flags/eslint-config`,
  `@pluma-flags/storybook`) are private workspace packages. They carry a
  `version` field for workspace tooling but are not published or versioned for
  external consumption.

## Version Correlation

Docker, SDK, and Types version numbers are independent — they do not need to
match. A deployment might run Docker `1.2.0`, SDK `1.1.0`, and Types `1.0.0`
simultaneously.

The Docker release bundles the API, App, and database migrations as a single
unit. Upgrading the API image is sufficient to apply new migrations and serve
the updated UI.

Check the [Compatibility matrix](#compatibility-matrix) and the
[GitHub Releases](https://github.com/403-html/pluma/releases) page when mixing
versions across packages.

## Breaking Change Policy

### SDK (`@pluma-flags/sdk`)

A **major** bump is required when any of the following change in a
backward-incompatible way:

- `PlumaSnapshotCache` public API (methods, constructor options)
- Evaluator interface or evaluation behavior
- Exported utility functions or their signatures

### Types (`@pluma-flags/types`)

A **major** bump is required when:

- Exported TypeScript type shapes change (renamed, removed, or restructured
  fields)
- Exported Zod schemas change validation rules in a breaking way
- Exported constants are removed or change value

### API (Admin + SDK endpoints)

A **major** bump is required when:

- Admin API (`/api/v1/*`) request or response schemas change incompatibly
- SDK API (`/sdk/v1/*`) snapshot format changes
- Authentication flows change (session auth or SDK Bearer token)

### Docker / App

A **major** bump is required when:

- Required environment variables are added, removed, or renamed
- Database schema changes break existing deployments (see
  [MIGRATION.md](MIGRATION.md))
- Default behavior changes in a way that requires operator intervention

### Database Migrations

- **Additive** migrations (new tables, new nullable columns, new indexes) →
  **minor** Docker bump
- **Destructive** migrations (dropped columns/tables, renames with data loss,
  type changes) → **major** Docker bump with an explicit upgrade guide

## Pre-release Conventions

Pre-release versions use dot-separated identifiers after a hyphen:

```
1.0.0-alpha.1
1.0.0-beta.1
1.0.0-rc.1
```

- Pre-release SDK and Types packages are published to npm with the `next`
  dist-tag (`npm install @pluma-flags/sdk@next`).
- Pre-release Docker images are tagged with the full pre-release version (e.g.,
  `v1.0.0-beta.1`) but **not** tagged `latest`.

## v1 Contract

Reaching `1.0.0` for a package establishes these stability guarantees:

| Area                  | Guarantee                                            |
| --------------------- | ---------------------------------------------------- |
| SDK public API        | Stable; changes follow semver strictly               |
| SDK snapshot format   | Frozen per major version                             |
| Types exports         | Frozen per major version                             |
| Admin API endpoints   | Frozen per major version; new endpoints = minor bump |
| SDK API endpoints     | Frozen per major version                             |
| Environment variables | Contract frozen per major version                    |
| Database schema       | Changes always include Prisma migration files        |

"Frozen" means no removals or incompatible changes within a major version. New
additions (endpoints, optional fields, new types) are permitted in minor
releases.

## Internal Packages

The following packages are **private** (`"private": true` in `package.json`) and
do not follow semver for external consumers:

- `@pluma-flags/db` — Prisma ORM, migrations, seed scripts
- `@pluma-flags/eslint-config` — shared ESLint configuration
- `@pluma-flags/storybook` — component development environment

Their `version` fields exist only for pnpm workspace compatibility.

## Compatibility Matrix

As versions are released, a compatibility matrix mapping SDK versions to minimum
required API versions will be maintained in this section.
