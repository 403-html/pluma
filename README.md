# Pluma

Self-hosted feature flag system — manage flags via a web UI and evaluate them in your application with a lightweight SDK.

## Running with Docker Compose

Pluma ships as pre-built Docker images. No build step required.

**1. Create a `docker-compose.yml`:**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${DB_USER:-pluma}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-pluma}
      POSTGRES_DB: ${DB_NAME:-pluma}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-pluma} -d ${DB_NAME:-pluma}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    image: ghcr.io/403-html/pluma-api:latest
    ports:
      - "2137:2137"
    environment:
      DB_USER: ${DB_USER:-pluma}
      DB_PASSWORD: ${DB_PASSWORD:-pluma}
      DB_NAME: ${DB_NAME:-pluma}
    depends_on:
      db:
        condition: service_healthy

  app:
    image: ghcr.io/403-html/pluma-app:latest
    ports:
      - "3000:3000"
    environment:
      API_URL: ${API_URL:-http://api:2137}
    depends_on:
      - api

volumes:
  db_data:
```

**2. Start the stack:**

```bash
docker compose up -d
```

- **UI** → [http://localhost:3000](http://localhost:3000)
- **API** → [http://localhost:2137](http://localhost:2137)

### Environment Variables

| Variable      | Default              | Description                                      |
|---------------|----------------------|--------------------------------------------------|
| `DB_USER`     | `pluma`              | PostgreSQL username                              |
| `DB_PASSWORD` | `pluma`              | PostgreSQL password                              |
| `DB_NAME`     | `pluma`              | PostgreSQL database name                         |
| `API_URL`     | `http://api:2137`    | API base URL (override when API is external)     |

> **Production:** set `DB_PASSWORD` to a strong value and override `API_URL` if the API is publicly accessible.

## SDK

### Install

```bash
npm install @pluma/sdk
# or
pnpm add @pluma/sdk
```

### Usage

SDK tokens are created in the Pluma UI under **Settings**. Each token is scoped to a project and environment.

```ts
import { PlumaSnapshotCache } from "@pluma/sdk";

const client = PlumaSnapshotCache.create({
  baseUrl: "http://localhost:2137",
  token: "sdk_your_token_here", // from UI → Settings
  ttlMs: 30_000, // optional; defaults to 30 000 ms (30 s)
});

const evaluator = await client.evaluator({ subjectKey: "user-123" });

if (evaluator.isEnabled("my-feature-flag")) {
  // feature is enabled for this subject
}
```

`evaluator()` fetches a snapshot from `/sdk/v1/snapshot` and caches it for `ttlMs`. Call it once per request or reuse across calls as appropriate for your workload.

## Contributing

- Full development setup (Node.js, pnpm, Prisma, local DB) is documented in [CONTRIBUTING.md](CONTRIBUTING.md).
- The stack is a pnpm monorepo: `apps/api` (Fastify), `apps/app` (Next.js), `packages/sdk`, `packages/db`, `packages/types`.
- Lint, test, and build must pass before opening a PR.
- Keep cross-package contracts in `@pluma/types`; commit migration files when the schema changes.
