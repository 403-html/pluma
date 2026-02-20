# Pluma

Self-hosted feature flag system built as a pnpm monorepo.

Pluma has two API planes:

- **Admin API** (`/api/v1/*`): authenticated management endpoints for projects, environments, flags, tokens, and config.
- **SDK API** (`/sdk/v1/*`): read-only snapshot endpoints authenticated with SDK tokens.

## Monorepo Architecture

- `apps/app` - Next.js UI for operators
- `apps/api` - Fastify API server (Admin + SDK routes)
- `packages/db` - Prisma + PostgreSQL schema, migrations, and client package
- `packages/sdk` - npm SDK package
- `packages/types` - shared TypeScript types and schemas

## Prerequisites

- Node.js (current LTS recommended)
- pnpm `10.29.3+`
- Docker (for local PostgreSQL or full Docker Compose workflow)

## Getting Started

### Docker (Recommended)

The standardized development approach uses Docker Compose for all services (PostgreSQL, API, App) with hot reload support.

**Development mode** (hot reload enabled):
```bash
docker compose up
```

**Production mode** (optimized builds):
```bash
docker compose -f docker-compose.prod.yml up --build
```

**Database-only** (backward compatibility):
```bash
cd packages/db && docker compose up -d
```

See **[DOCKER.md](DOCKER.md)** for comprehensive Docker documentation, troubleshooting, and advanced workflows.

### Manual / Local Setup

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
