# Getting Started

This guide walks through setting up Pluma for development or production use.

## Prerequisites

- Node.js (current LTS recommended)
- pnpm `10.29.3+`
- Docker and Docker Compose (for containerized development)

## Option 1: Docker Development (Recommended)

The easiest way to run Pluma is using Docker Compose, which handles all services (PostgreSQL, API, UI) with hot-reload enabled.

### First-time setup

```bash
# Copy environment file
cp .env.example .env
# Edit .env if you want to change database credentials (optional for development)
```

### Quick start

```bash
# Start all services in development mode
docker compose up

# Or run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### What runs

- PostgreSQL: `localhost:5432`
- API server: `localhost:4000` (with hot-reload)
- Next.js UI: `localhost:3000` (with hot-reload)

**File changes are automatically detected** - no container restart needed.

### Production build

```bash
# IMPORTANT: Set production credentials in .env before deploying
# Create .env with strong passwords for production use

# Build and run production containers
docker compose -f docker-compose.prod.yml up --build

# Or in detached mode
docker compose -f docker-compose.prod.yml up -d --build
```

**Note**: In production, always:
1. Set strong `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env` (use `openssl rand -base64 32` to generate)
2. Override `NEXT_PUBLIC_API_URL` with your actual API domain
3. Use proper secrets management (see [Security](security.md))

## Option 2: Local Development (Without Docker)

If you prefer to run services directly on your host:

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

4. Start development servers:

    ```bash
    # From repository root - runs all services
    pnpm dev

    # Or run individual services
    pnpm --filter @pluma/api dev  # API on port 4000
    pnpm --filter @pluma/app dev  # UI on port 3000
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
