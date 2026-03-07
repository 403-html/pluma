# Load Tests

This directory contains [k6](https://k6.io/) performance test scripts for the Pluma API.

## Prerequisites

You need **one** of the following:

| Option | Notes |
|--------|-------|
| **k6 binary** | Install from [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation/) |
| **Docker** | No k6 install required — use the official `grafana/k6` image |

## Starting the Stack

### Single API instance (default)

```bash
# Build images and start the full stack
docker compose up --build

# Subsequent runs (no rebuild needed)
docker compose up
```

### Multiple API replicas (horizontal scaling)

```bash
# Build images and start 3 API replicas behind nginx
docker compose up --build --scale api=3

# Scale an already-running stack without rebuilding
docker compose up --scale api=3
```

nginx is configured to round-robin across all running `api` replicas automatically via Docker Compose DNS. The host-facing port (`${API_PORT:-2137}`) belongs exclusively to nginx, so any number of API replicas can run without port conflicts.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:2137` | Base URL of the Pluma API |
| `SDK_TOKEN` | *(empty)* | A valid SDK bearer token for authenticated endpoints |

Without `SDK_TOKEN` the scripts still run and exercise the public `/health` endpoint. SDK snapshot checks are skipped.

### Getting an SDK Token

1. Open the Pluma Admin UI (`http://localhost:3000`)
2. Navigate to **Settings → SDK Tokens → Create token**
3. Copy the generated token and export it:

```bash
export SDK_TOKEN=plt_your_token_here
```

Alternatively, create a token via the Admin API:

```bash
curl -X POST http://localhost:2137/admin/v1/tokens \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <admin-token>' \
  -d '{"name": "load-test"}'
```

## Running the Tests

### Smoke test — `k6/smoke.js`

**Purpose:** Verify the system works correctly under minimal load (1 VU for 60 s). Run this first to confirm basic functionality before heavier tests.

**Thresholds:** <1 % errors, p95 latency < 500 ms.

```bash
# k6 binary
k6 run load-tests/k6/smoke.js

# with env vars
API_URL=http://localhost:2137 SDK_TOKEN=plt_xxx k6 run load-tests/k6/smoke.js

# Docker (no k6 install needed)
docker run --rm -i --network host \
  -e API_URL=http://localhost:2137 \
  -e SDK_TOKEN=plt_xxx \
  grafana/k6 run - < load-tests/k6/smoke.js
```

### Load test — `k6/load.js`

**Purpose:** Simulate typical production traffic. Ramps to 50 VUs over 1 minute, sustains for 5 minutes, then ramps back down.

**Thresholds:** <1 % errors, p95 latency < 500 ms.

```bash
# k6 binary
k6 run load-tests/k6/load.js

# Docker
docker run --rm -i --network host \
  -e API_URL=http://localhost:2137 \
  -e SDK_TOKEN=plt_xxx \
  grafana/k6 run - < load-tests/k6/load.js
```

### Stress test — `k6/stress.js`

**Purpose:** Discover the system's breaking point. Ramps to 100 VUs, sustains, then pushes to 300 VUs to find where degradation begins.

**Thresholds:** <5 % errors, p95 latency < 2 s (relaxed to account for stress conditions).

```bash
# k6 binary
k6 run load-tests/k6/stress.js

# Docker
docker run --rm -i --network host \
  -e API_URL=http://localhost:2137 \
  -e SDK_TOKEN=plt_xxx \
  grafana/k6 run - < load-tests/k6/stress.js
```

## PostgreSQL Connection Pools

Each API instance opens its own Prisma connection pool (~10 connections by default). At small replica counts this is fine:

| Replicas | Max DB connections |
|----------|--------------------|
| 1 | ~10 |
| 3 | ~30 |
| 10 | ~100 |

At 10 or more replicas the total connection count may approach PostgreSQL's default limit (`max_connections = 100`). In that case, add **PgBouncer** as a connection pooler between the API instances and PostgreSQL. See [`SCALING.md`](../SCALING.md) for details.
