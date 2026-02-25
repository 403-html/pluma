---
name: local-dev-setup
description: Golden-path bootstrap for new Pluma contributors — from clone to running stack
---

This skill documents the canonical, step-by-step process for getting a fully working local Pluma development environment. Follow this in order; every step is required.

## Prerequisites

- Node.js (LTS recommended)
- pnpm 10.29.3+ (`npm install -g pnpm@10.29.3`)
- Docker + Docker Compose (for PostgreSQL)
- Git

## Step 1: Clone and Install Dependencies

```bash
git clone <repo-url>
cd pluma
pnpm install
```

All workspace packages are installed in one pass. Do not use `npm install` or `yarn`.

## Step 2: Start PostgreSQL

```bash
cd packages/db
docker-compose up -d
```

This starts a PostgreSQL 16 container bound to `localhost:5432` with database `pluma`, user `pluma`, password `pluma`.

Verify it is healthy:

```bash
docker-compose ps
```

Expected: `State` column shows `Up`.

## Step 3: Configure Environment Files

Each app and the db package need a `.env` file. Copy the provided examples:

```bash
# Database
cp packages/db/.env.example packages/db/.env

# API
cp apps/api/.env.example apps/api/.env

# Next.js UI
cp apps/app/.env.example apps/app/.env
```

Default values work out of the box for local development:

| File | Key variable | Default |
|---|---|---|
| `packages/db/.env` | `DATABASE_URL` | `postgresql://pluma:pluma@localhost:5432/pluma?schema=public` |
| `apps/api/.env` | `PORT` / `HOST` | `2137` / `0.0.0.0` |
| `apps/app/.env` | `NEXT_PUBLIC_API_URL` | `http://localhost:2137` |

Do not commit `.env` files. Only `.env.example` files are tracked in git.

## Step 4: Initialise the Database

```bash
pnpm --filter @pluma/db db:generate

pnpm --filter @pluma/db db:migrate

# optional
pnpm --filter @pluma/db db:seed
```

## Step 5: Start the Development Servers

```bash
# recommended: all apps together
pnpm --filter './apps/*' -r dev

pnpm --filter @pluma/app dev   # Next.js UI  → http://localhost:3000
pnpm --filter @pluma/api dev   # Fastify API → http://localhost:2137
```

## Step 6: Verify the Stack

| Check | Command / URL | Expected |
|---|---|---|
| API health | `curl http://localhost:2137/health` | `{"status":"ok"}` or HTTP 200 |
| UI | `http://localhost:3000` | Login / dashboard renders |
| DB Studio | `pnpm --filter @pluma/db db:studio` | Opens at `http://localhost:5555` |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot connect to database` | Ensure Docker container is running: `docker-compose ps` in `packages/db/` |
| `Prisma Client not found` | Run `pnpm --filter @pluma/db db:generate` |
| `Port already in use` | Check `.env` `PORT` value; kill the conflicting process |
| `Module not found` errors | Run `pnpm install` at repo root; check `workspace:*` deps are resolved |
| Stale types after schema change | Run `pnpm --filter @pluma/db db:generate` then restart the API |

## When to Invoke This Skill

Invoke this skill when:
- Onboarding a new contributor
- Setting up a fresh machine or CI environment
- Recovering from a corrupted local state (re-run from Step 3 onward)
