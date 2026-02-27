# Pluma

> ⚠️ **Alpha — not yet production-ready.** APIs and data model are still changing. Do not use in production.

Self-hosted feature flag system built as a pnpm monorepo.

Pluma has two API planes:

- **Admin API** (`/api/v1/*`): authenticated management endpoints for projects, environments, flags, tokens, and config.
- **SDK API** (`/sdk/v1/*`): read-only snapshot endpoints authenticated with SDK tokens.

## Monorepo Architecture

- `apps/app` - Next.js UI for operators ([README](apps/app/README.md))
- `apps/api` - Fastify API server (Admin + SDK routes)
- `packages/db` - Prisma + PostgreSQL schema, migrations, and client package
- `packages/sdk` - npm SDK package
- `packages/types` - shared TypeScript types and schemas

## Quick Start (Local, Docker Compose)

> **Note:** Published Docker images are not yet available. You must build the images locally before running the stack.

1. Copy and configure the environment file:

    ```bash
    cp .env.example .env
    # Open .env and set SESSION_SECRET to a long random string:
    #   openssl rand -hex 32
    # Optionally change POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB.
    ```

2. Build images from source:

    ```bash
    docker compose build
    ```

    To force a full rebuild without Docker's layer cache:

    ```bash
    docker compose build --no-cache
    ```

3. Start all services (PostgreSQL, migrations, API, web app):

    ```bash
    docker compose up -d
    ```

    To rebuild images and restart all containers in one step (no cache):

    ```bash
    docker compose build --no-cache && docker compose up --force-recreate --remove-orphans -d
    ```

4. Open the app in your browser: **http://localhost:3000**

The API is available at `http://localhost:2137`. Migrations run automatically before the API starts.

---

## Prerequisites

- Node.js (current LTS recommended)
- pnpm `10.29.3+`
- Docker (for local PostgreSQL)

## First-Time Setup

1. Install dependencies at repo root:

    ```bash
    pnpm install
    ```

2. Bootstrap database from `packages/db`:

    ```bash
    cd packages/db
    docker-compose up -d
    cp .env.example .env
    pnpm db:generate
    pnpm db:migrate
    pnpm db:seed   # optional
    cd ../..
    ```

3. Create app env files:

    ```bash
    cp apps/api/.env.example apps/api/.env
    cp apps/app/.env.example apps/app/.env
    ```

## Common Workflows

### Root Commands

Run from repository root:

- `pnpm dev` - run all workspace `dev` scripts
- `pnpm build` - build all workspaces
- `pnpm lint` - lint repository
- `pnpm test` - run workspace tests

### Package-Specific Examples

- `pnpm --filter @pluma/api dev` - run API only
- `pnpm --filter @pluma/app dev` - run UI only
- `pnpm --filter @pluma/sdk test` - run SDK tests
- `pnpm --filter @pluma/db db:studio` - open Prisma Studio

### Database Workflow (`packages/db`)

- `pnpm db:generate` - regenerate Prisma client
- `pnpm db:migrate` - create/apply migration in development
- `pnpm db:push` - push schema without migration files (quick local iteration)
- `pnpm db:migrate:deploy` - apply committed migrations (deployment)

## Environment Variables

- Keep environment files local; do not commit `.env` files.
- Templates:
  - `apps/api/.env.example`
  - `apps/app/.env.example`
  - `packages/db/.env.example`
- `apps/api` and `packages/db` both use `DATABASE_URL` for PostgreSQL connection.
- If running UI and API together, ensure API `PORT` does not conflict with the UI dev port.

## Troubleshooting

- **Database connection errors**: verify Docker is running and PostgreSQL container is healthy (`cd packages/db && docker-compose ps`).
- **Prisma type/client drift**: run `pnpm --filter @pluma/db db:generate` after pulling schema changes.
- **Port already in use**: update `apps/api/.env` `PORT` value and restart dev servers.
- **Workspace import issues**: rerun `pnpm install` at root to refresh workspace links.

## Notes for Contributors

- Keep changes inside package boundaries; share cross-package contracts via `@pluma/types`.
- If schema changes are introduced, commit generated migration files under `packages/db/prisma/migrations`.
- Validate before opening PRs with: `pnpm lint && pnpm test && pnpm build`.
