# Contributing to Pluma

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) (for the local database)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start the database
cd packages/db
docker compose up -d
cp .env.example .env   # uses default credentials — fine for local dev

# 3. Apply migrations and seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed  # optional

# 4. Run the full stack
cd ../..
pnpm dev
```

- **UI** → <http://localhost:3000>
- **API** → <http://localhost:2137>

## Repository layout

| Path             | Description                  |
| ---------------- | ---------------------------- |
| `apps/api`       | Fastify API server           |
| `apps/app`       | Next.js 16 UI                |
| `packages/sdk`   | npm SDK (`@pluma-flags/sdk`) |
| `packages/db`    | Prisma schema + migrations   |
| `packages/types` | Shared TypeScript types      |

## Before opening a PR

```bash
pnpm lint    # ESLint across the monorepo
pnpm -r build  # type-check + build all packages
pnpm -r test   # Vitest suites (requires the DB to be running)
```

All three must pass. PRs that fail CI will not be merged.

## Guidelines

- Keep shared contracts in `@pluma-flags/types`; bump the package when types
  change.
- Commit Prisma migration files (`packages/db/prisma/migrations/`) when the
  schema changes — never use `db:push` for changes meant for production.
- Write or update tests for every behaviour change.
- Keep functions under ~60 lines; validate all external inputs with Zod.
