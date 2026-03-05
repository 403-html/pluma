# Database Migrations

## Overview

Pluma uses [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) to
manage PostgreSQL schema changes. Migration files live in `packages/db/prisma/migrations/`
and are included in every Docker release. When the API container starts, pending
migrations are applied automatically via `prisma migrate deploy`.

Self-hosted operators do **not** need to run migrations manually — pulling and
starting a new API image is sufficient.

## Migration Compatibility Rules

| Change type | Examples | Docker bump | Backward compatible |
| --- | --- | --- | --- |
| **Additive** | New table, new nullable column, new index | Minor | Yes |
| **Destructive** | Drop column/table, rename with data loss, change column type | Major | No |
| **Data migration** | Backfill values, transform existing rows | Depends on context | Must be idempotent |

Additional rules:

- **Never edit a migration after it is merged to `main`.** Prisma tracks
  migrations by name and checksum; editing a deployed migration will cause
  `prisma migrate deploy` to fail.
- Data migrations must be **idempotent** — safe to run more than once without
  side effects.
- Every destructive migration must include rollback guidance in the release
  notes.

## Upgrade Process (Self-Hosted)

Follow these steps when upgrading to a new Docker release:

1. **Back up your database.**
   ```bash
   pg_dump -U pluma -d pluma > pluma_backup_$(date +%Y%m%d).sql
   ```

2. **Pull the new Docker images.**
   ```bash
   docker pull ghcr.io/403-html/pluma-api:<version>
   docker pull ghcr.io/403-html/pluma-app:<version>
   ```

3. **Restart the containers.**
   Migrations run automatically when the API container starts. If using Docker
   Compose:
   ```bash
   docker compose up -d
   ```

4. **Verify the migration succeeded.**
   Check the API container logs for Prisma migration output:
   ```bash
   docker compose logs api
   ```

5. **If a migration fails:**
   - Stop the containers.
   - Restore the database from backup:
     ```bash
     psql -U pluma -d pluma < pluma_backup_YYYYMMDD.sql
     ```
   - Report the issue on the [Pluma issue tracker](https://github.com/403-html/pluma/issues).

## Version Compatibility Matrix

> This matrix will be populated as versions are released.

| API image version | Minimum DB schema | Notes |
| --- | --- | --- |
| `0.1.0` | `0.1.0` (initial) | Baseline schema |

## Breaking Schema Changes

When a **major** Docker version includes destructive migrations, the release
must provide:

1. **Explicit rollback SQL** or step-by-step instructions to reverse the
   migration.
2. **Minimum backup recommendation** — operators should retain a database
   backup from before the upgrade for at least 7 days.
3. **Tested upgrade path** — the upgrade must be validated from the immediately
   preceding major version.

Check [CHANGELOG.md](CHANGELOG.md) and the GitHub Release notes for details on
every major version.

## SDK ↔ API Compatibility

SDK versions are **forward-compatible** within the same major API version:

- An SDK client built for API `v1.x` will continue to work with any `v1.y`
  API release (where `y ≥ x`).
- Upgrading the API within a major version will not break existing SDK clients.
- A new **major** API version may change the SDK snapshot format
  (`/sdk/v1/*`), requiring an SDK upgrade.

When upgrading across major API versions, upgrade the SDK to a version that
supports the new major API version first, then upgrade the API.

## Development Workflow

### Creating a New Migration

Use the Prisma CLI through the workspace script:

```bash
pnpm --filter @pluma-flags/db db:migrate
```

This runs `prisma migrate dev`, which will:

1. Detect schema changes in `packages/db/prisma/schema.prisma`.
2. Generate a new migration SQL file in `packages/db/prisma/migrations/`.
3. Apply the migration to your local database.
4. Regenerate the Prisma Client.

### Rules for Developers

- **Always** use `pnpm --filter @pluma-flags/db db:migrate` (or the shorthand
  `pnpm db:migrate` from the `packages/db` directory) to create migrations.
- **Never** edit an existing migration file after it has been committed.
- Use `pnpm --filter @pluma-flags/db db:push` for rapid prototyping only — it
  modifies the database schema without creating a migration file and must not
  be used in place of a real migration.
- Use `pnpm --filter @pluma-flags/db db:studio` to inspect data during
  development.
- Test migrations locally against a fresh database before opening a PR:
  ```bash
  docker compose down -v          # remove existing volume
  docker compose up postgres -d   # start fresh PostgreSQL
  pnpm --filter @pluma-flags/db db:migrate
  ```
