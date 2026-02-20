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
- Docker and Docker Compose (for containerized development)

## Getting Started

### Option 1: Docker Development (Recommended)

The easiest way to run Pluma is using Docker Compose, which handles all services (PostgreSQL, API, UI) with hot-reload enabled.

**First-time setup:**

```bash
# Copy environment file
cp .env.example .env
# Edit .env if you want to change database credentials (optional for development)
```

**Quick start:**

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

**What runs:**
- PostgreSQL: `localhost:5432`
- API server: `localhost:4000` (with hot-reload)
- Next.js UI: `localhost:3000` (with hot-reload)

**File changes are automatically detected** - no container restart needed.

**Production build:**

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
3. Use proper secrets management (see Security section below)

### Option 2: Local Development (Without Docker)

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

## Environment Variables

### Docker Compose (Default)

When using Docker Compose, environment variables are pre-configured in the compose files:
- API runs on port **4000**
- UI runs on port **3000**
- Database connection is automatically configured

**Note on NEXT_PUBLIC_API_URL**: 
- In development, `http://localhost:4000` works because the browser (running on your host machine) makes requests to the API exposed at localhost:4000.
- In production deployments, override `NEXT_PUBLIC_API_URL` with your actual API domain (e.g., `https://api.yourdomain.com`) before building, as this value is embedded at build time.

### Local Development

If running services locally (without Docker Compose):
- Keep environment files local; do not commit `.env` files.
- Templates:
  - `apps/api/.env.example` (PORT is now 4000 to avoid conflicts)
  - `apps/app/.env.example` (NEXT_PUBLIC_API_URL points to localhost:4000)
  - `packages/db/.env.example`
- `apps/api` and `packages/db` both use `DATABASE_URL` for PostgreSQL connection.

**Port Configuration:**
- API default: `4000` (changed from 3000 to avoid conflict with Next.js)
- UI default: `3000`
- PostgreSQL: `5432`

## Troubleshooting

### Docker Issues

- **Containers won't start**: Ensure Docker Desktop is running and has sufficient resources allocated.
- **Port already in use**: Stop conflicting services or change port mappings in docker-compose.yml.
- **Hot reload not working**: On Windows, ensure WSL2 backend is enabled. On macOS, file watching should work natively.
- **Database connection errors in container**: Wait for postgres health check to pass (check with `docker compose ps`).
- **Build cache issues**: Clear Docker build cache with `docker compose build --no-cache`.

### Local Development Issues

- **Database connection errors**: verify Docker is running and PostgreSQL container is healthy (`cd packages/db && docker-compose ps`).
- **Prisma type/client drift**: run `pnpm --filter @pluma/db db:generate` after pulling schema changes.
- **Port already in use**: update `apps/api/.env` `PORT` value and restart dev servers.
- **Workspace import issues**: rerun `pnpm install` at root to refresh workspace links.

### Switching Between Docker and Local

If switching from Docker to local development or vice versa:
- Stop all containers: `docker compose down`
- Clear any local dev servers (Ctrl+C)
- Ensure correct DATABASE_URL in `.env` files:
  - Docker: `postgresql://pluma:pluma@postgres:5432/pluma` (uses service name)
  - Local: `postgresql://pluma:pluma@localhost:5432/pluma` (uses localhost)

## Security Best Practices

### Secrets Management

**Development**: `.env` files with defaults are acceptable for local development.

**Production**: Do NOT use `.env` files committed to version control. Instead, use:

- **Docker Swarm**: [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
  ```bash
  echo "strong_password" | docker secret create postgres_password -
  ```

- **Kubernetes**: [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
  ```yaml
  apiVersion: v1
  kind: Secret
  metadata:
    name: pluma-db-credentials
  type: Opaque
  data:
    password: <base64-encoded-password>
  ```

- **Cloud Providers**:
  - AWS: [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) or [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
  - Azure: [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault)
  - GCP: [Secret Manager](https://cloud.google.com/secret-manager)

- **Docker Compose Override**: Use environment-specific compose files
  ```bash
  # docker-compose.override.yml (gitignored)
  services:
    postgres:
      environment:
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # From secure env var injection
  ```

**Note on DATABASE_URL**: DATABASE_URL embeds credentials as plaintext in the connection string environment variable. For enhanced security in production:
- Use Docker secrets (example below) instead of environment variables
- Or inject credentials at runtime from a secrets manager
- Avoid logging DATABASE_URL or exposing it via container inspection

**Example with Docker Secrets** (recommended for production):
```yaml
# docker-compose.prod.yml with secrets
services:
  postgres:
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

secrets:
  postgres_password:
    external: true
```

### Password Generation

Generate cryptographically secure passwords and **store them in a password manager**:
```bash
# PostgreSQL password (32 bytes = 44 base64 chars)
openssl rand -base64 32

# Or use pwgen if available
pwgen -s 32 1
```

**Important**: Save the generated password immediately - running the command again produces a different password.

### Container Security

- ✅ **Non-root users**: All services run as non-root (implemented)
- ✅ **Read-only filesystems**: Consider adding `read_only: true` with tmpfs mounts
- ✅ **Resource limits**: Add CPU/memory limits in production
- ✅ **Network policies**: Restrict inter-container communication
- ✅ **Image scanning**: Run `docker scan` or Trivy on built images

## Notes for Contributors

- Keep changes inside package boundaries; share cross-package contracts via `@pluma/types`.
- If schema changes are introduced, commit generated migration files under `packages/db/prisma/migrations`.
- Validate before opening PRs with: `pnpm lint && pnpm test && pnpm build`.
