<div align="center">

[![CI](https://github.com/403-html/pluma/actions/workflows/ci.yml/badge.svg)](https://github.com/403-html/pluma/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/github/v/release/403-html/pluma?label=docker)](https://github.com/403-html/pluma/releases)
[![SDK](https://img.shields.io/npm/v/%40pluma-flags%2Fsdk?label=sdk)](https://www.npmjs.com/package/@pluma-flags/sdk)

<img width="4030" height="1766" alt="Pluma header" src="https://github.com/user-attachments/assets/c2128faa-3d60-44de-a4f1-60384660fcb3" />

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

### SDK

```bash
npm install @pluma-flags/sdk
```

```ts
const client = PlumaSnapshotCache.create({ baseUrl, token });
const evaluator = await client.evaluator({ subjectKey: "user-123" });
evaluator.isEnabled("my-feature");
```

Create SDK tokens in the Pluma UI under **Organisation → API Keys**. See the
[full SDK documentation](https://403-html.github.io/pluma/sdk) for framework
examples, per-subject targeting, caching, and the complete API reference.

## Documentation

📖 **[403-html.github.io/pluma](https://403-html.github.io/pluma/)** — getting
started, SDK reference, architecture, scaling, and more.

## Scaling

Stateless API — scale horizontally behind nginx. See [SCALING.md](SCALING.md) or
the [scaling guide](https://403-html.github.io/pluma/scaling).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) or the
[contributing guide](https://403-html.github.io/pluma/contributing).

## Support

If Pluma is useful to you, consider
[buying a coffee ☕](https://ko-fi.com/403html).

## License

Apache 2.0, see [LICENSE](LICENSE).
