# Pluma

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)

Self-hosted feature flag system with dual API planes for admin management and SDK access.

## Features

- **Admin API** (`/api/v1/*`) — Authenticated endpoints for managing projects, environments, flags, and tokens
- **SDK API** (`/sdk/v1/*`) — Read-only snapshot endpoints for client SDKs
- **Monorepo architecture** — Clean separation between API, UI, database, and SDK packages
- **Hot-reload development** — File watching in Docker for rapid iteration
- **Production-ready** — Built-in security best practices and secrets management

## Prerequisites

- Node.js (current LTS)
- pnpm `10.29.3+`
- Docker and Docker Compose

## Quick Start

```bash
# Copy environment file and start all services
cp .env.example .env
docker compose up
```

Services run at:
- UI: http://localhost:3000
- API: http://localhost:4000
- PostgreSQL: localhost:5432

## Documentation

- **[Getting Started](docs/getting-started.md)** — Full setup guide for Docker and local development
- **[Configuration](docs/configuration.md)** — Environment variables and port settings
- **[Troubleshooting](docs/troubleshooting.md)** — Common issues and solutions
- **[Security](docs/security.md)** — Production secrets management and best practices
- **[Contributing](docs/contributing.md)** — Development workflow and guidelines

## Monorepo Structure

- `apps/app` — Next.js UI for operators
- `apps/api` — Fastify API server (Admin + SDK routes)
- `packages/db` — Prisma schema, migrations, and client
- `packages/sdk` — npm SDK package
- `packages/types` — Shared TypeScript types

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.

## Contributing

See [Contributing Guide](docs/contributing.md) for development guidelines.
