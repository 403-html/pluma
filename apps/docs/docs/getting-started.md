---
sidebar_position: 2
---

# Getting Started

Get the Pluma stack running locally in under five minutes.

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 10 (`npm i -g pnpm`)
- **Docker** — used to run PostgreSQL via `docker compose`
- A `.env` file in `apps/api/` (copy from `apps/api/.env.example`)

## Start the stack

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Start the database
docker compose up -d

# 3. Apply migrations and seed
pnpm --filter @pluma/db db:migrate
pnpm --filter @pluma/db db:seed

# 4. Run the API and web app concurrently
pnpm dev
```

The API is now available at **http://localhost:3000** and the web app at **http://localhost:3001**.

## Verify the API

```bash
curl http://localhost:3000/health
# → { "status": "ok" }
```

The OpenAPI spec is served at:

```
http://localhost:3000/documentation/json   ← machine-readable
http://localhost:3000/documentation        ← Swagger UI
```

## Generate API reference docs

With the API running, pull the OpenAPI spec and emit Markdown pages into this docs site:

```bash
pnpm --filter @pluma/docs gen-api-docs
```

Then build or preview the docs:

```bash
pnpm --filter @pluma/docs start   # live dev server
pnpm --filter @pluma/docs build   # static output → apps/docs/build/
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to database` | Ensure Docker is running and `docker compose up -d` succeeded |
| `Missing env variable` | Copy `apps/api/.env.example` → `apps/api/.env` and fill in values |
| `Port already in use` | Check for existing processes on ports 3000/3001/5432 |
