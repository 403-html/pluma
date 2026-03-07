<div align="center">

[![CI](https://github.com/403-html/pluma/actions/workflows/ci.yml/badge.svg)](https://github.com/403-html/pluma/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/github/v/release/403-html/pluma?label=docker)](https://github.com/403-html/pluma/releases)
[![SDK](https://img.shields.io/npm/v/%40pluma-flags%2Fsdk?label=sdk)](https://www.npmjs.com/package/@pluma-flags/sdk)

# Pluma

<p align="center">Self-hosted feature flag system. Manage flags via a web UI and evaluate them in your application with a lightweight SDK.</p>

<p align="center"><em>Pluma (Spanish: feather) — lightweight by design.</em></p>

</div>

---

## Quick start

### Docker Compose

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
      test:
        ["CMD-SHELL", "pg_isready -U ${DB_USER:-pluma} -d ${DB_NAME:-pluma}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    image: ghcr.io/403-html/pluma-api:latest
    ports:
      - "2137:2137"
    environment:
      DATABASE_URL: postgresql://${DB_USER:-pluma}:${DB_PASSWORD:-pluma}@db:5432/${DB_NAME:-pluma}?schema=public
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

| Variable      | Default           | Description              |
| ------------- | ----------------- | ------------------------ |
| `DB_USER`     | `pluma`           | PostgreSQL username      |
| `DB_PASSWORD` | `pluma`           | PostgreSQL password      |
| `DB_NAME`     | `pluma`           | PostgreSQL database name |
| `API_URL`     | `http://api:2137` | API base URL             |

> **First run:** change `DB_PASSWORD` to a strong value before going to
> production.

> **Horizontal scaling:** add an nginx load-balancer and run multiple API
> replicas with `--scale api=N` — no image rebuild required. See
> [SCALING.md](SCALING.md) for the full setup.

### SDK

```bash
npm install @pluma-flags/sdk
# or
pnpm add @pluma-flags/sdk
```

SDK tokens are created in the Pluma UI under **Organisation → API Keys**. Each
token is scoped to a project and environment.

```ts
import { PlumaSnapshotCache } from "@pluma-flags/sdk";

const client = PlumaSnapshotCache.create({
  baseUrl: "http://localhost:2137",
  token: "sdk_your_token_here", // Organisation → API Keys in the Pluma UI
  ttlMs: 30_000, // optional; defaults to 30_000 ms (30 s)
});

const evaluator = await client.evaluator({ subjectKey: "user-123" });

if (evaluator.isEnabled("my-feature-flag")) {
  // feature is enabled for this subject
}
```

For the full SDK reference (caching, per-subject targeting, framework examples,
and the complete API) see [`packages/sdk/README.md`](packages/sdk/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup and contribution
guidelines.

## Support

If Pluma is useful to you, consider
[buying a coffee ☕](https://ko-fi.com/403html).

## License

Apache 2.0, see [LICENSE](LICENSE).
