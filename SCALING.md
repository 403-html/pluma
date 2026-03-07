# Horizontal Scaling Guide

Pluma's API tier is **fully stateless** — all session data is stored in
PostgreSQL, and there is no in-memory shared state between instances. This means
you can run as many API replicas as you need by changing a single flag.

## Why Pluma Scales Horizontally

- **DB-backed sessions** — no sticky sessions required; any replica can handle
  any request
- **No shared caches** — feature flags are read from the database on every
  request (or cached per-process with short TTL)
- **Idempotent health checks** — `/health` reads nothing; safe to load-balance
- **Stateless authentication** — SDK tokens and admin tokens are validated
  against the database, not an in-process store

## Quick Start

### Step 1 — Build the images

```bash
# From the monorepo root (only needed once, or after code changes)
docker compose build
```

### Step 2 — Start with N API replicas

```bash
# 3 API replicas behind nginx — no rebuild needed
docker compose up --scale api=3

# 5 replicas
docker compose up --scale api=5

# Single instance (default, identical to plain `docker compose up`)
docker compose up
```

That's it. nginx resolves the upstream name `api` via Docker Compose's internal
DNS, which automatically returns all healthy replica IPs and round-robins
traffic across them.

## Architecture

```
Host
 │
 └─ :2137 (or $API_PORT)
       │
   [nginx:1.27-alpine]          ← pluma-nginx (single container)
       │  round-robin
   ┌───┴──────────────┐
[api replica 1]  [api replica N]  ← pluma-api-1 … pluma-api-N
       │                 │
       └────────┬────────┘
          [postgres:16]           ← pluma-postgres (single container)
```

The `app` (Next.js) service always talks to nginx (`http://nginx:80`) so it
automatically reaches a healthy API replica regardless of how many are running.

## nginx Load Balancer

The nginx configuration lives at `docker/nginx.conf` and uses Docker Compose's
built-in DNS for upstream resolution:

```nginx
upstream pluma_api {
    server api:2137;   # Docker DNS resolves "api" → all replica IPs
}
```

This is nginx's **default round-robin** strategy — sufficient for most
workloads. For more advanced strategies (least-connections, IP-hash) you would
need nginx Plus or an alternative like Caddy/Traefik.

## Database Connection Pools

Each API replica opens its own Prisma connection pool. The default pool size is
approximately **10 connections per instance**.

| Replicas | Total DB connections |
| -------- | -------------------- |
| 1        | ~10                  |
| 3        | ~30                  |
| 5        | ~50                  |
| 10       | ~100                 |

PostgreSQL's default `max_connections` is **100**. At 10 or more replicas you
will exhaust this limit.

### Mitigation options

1. **Increase `max_connections`** in `postgresql.conf` (simple, but uses more
   memory per connection)
2. **Add PgBouncer** as a transaction-mode connection pooler between the API and
   PostgreSQL — this is the recommended approach for large deployments:

```yaml
# Example addition to docker-compose.yml
pgbouncer:
  image: bitnami/pgbouncer:latest
  environment:
    POSTGRESQL_HOST: postgres
    POSTGRESQL_PORT: 5432
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 1000
    PGBOUNCER_DEFAULT_POOL_SIZE: 20
```

Then update `DATABASE_URL` in the api service to point to `pgbouncer:5432`.

## Concurrent Migrations

Pluma uses Prisma migrations. When multiple replicas start simultaneously they
may all attempt to run `prisma migrate deploy`. This is **safe** because Prisma
uses PostgreSQL advisory locks to serialise migration execution — only one
instance runs the migrations and the rest wait, then proceed once the lock is
released.

## Load Tests

Performance scripts are in [`load-tests/k6/`](load-tests/README.md). Run a smoke
test after scaling to confirm all replicas are responding:

```bash
# Quick sanity check after scaling (no k6 binary required)
docker compose run --rm k6 run /scripts/smoke.js

# Full load test (ramps to 50 VUs)
docker compose run --rm k6 run /scripts/load.js

# Stress test (ramps to 300 VUs — finds breaking point)
docker compose run --rm k6 run /scripts/stress.js
```

See [`load-tests/README.md`](load-tests/README.md) for full instructions
including binary-based execution.

## Production Considerations

For production deployments beyond a local Docker Compose setup:

### Database

- Use a **managed PostgreSQL** service (AWS RDS, GCP Cloud SQL, Supabase, Neon,
  etc.) for automatic failover, backups, and connection pooling
- Enable **PgBouncer** or use a managed pooler (e.g. RDS Proxy) once API
  replicas exceed 5–10

### Orchestration

- **Kubernetes**: Deploy the API as a `Deployment` with an
  `HorizontalPodAutoscaler` (HPA) targeting CPU/request-rate metrics
- **AWS ECS**: Use a Fargate service with target-tracking scaling on ALB request
  count
- **Fly.io**: `fly scale count 3` — the platform handles load balancing
  automatically

### Ingress / TLS

- Replace the nginx container with a cloud load balancer (ALB, GCP LB,
  Cloudflare) that terminates TLS
- Set `API_URL` in the `app` service to the external load balancer URL

### Monitoring

- Export Prometheus metrics from the API and scrape with Grafana
- Alert on `http_req_failed > 1%` and `p95 latency > 500 ms` (matching the
  load-test thresholds)
- Monitor PostgreSQL connection count — alert when approaching `max_connections`

### Health checks

The API exposes `GET /health` which returns `{"status":"ok"}`. Configure your
load balancer or orchestrator to use this endpoint to remove unhealthy instances
from rotation automatically.
