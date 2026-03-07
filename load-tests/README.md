# Load Tests

k6 performance scripts for the Pluma API.

| Script      | VUs | Duration           | Thresholds                 |
| ----------- | --- | ------------------ | -------------------------- |
| `smoke.js`  | 1   | 60 s               | p95 < 500 ms, errors < 1 % |
| `load.js`   | 50  | 7 min (ramp+hold)  | p95 < 500 ms, errors < 1 % |
| `stress.js` | 300 | 16 min (ramp+hold) | p95 < 2 s, errors < 5 %    |

## Running

### Via Docker Compose (no k6 install needed)

```bash
# Start the stack first
docker compose up -d

# Run a script
docker compose run --rm k6 run /scripts/smoke.js
docker compose run --rm k6 run /scripts/load.js
docker compose run --rm k6 run /scripts/stress.js

# With an SDK token
SDK_TOKEN=plt_xxx docker compose run --rm k6 run /scripts/smoke.js
```

### Via k6 binary

```bash
k6 run load-tests/k6/smoke.js
API_URL=http://localhost:2137 SDK_TOKEN=plt_xxx k6 run load-tests/k6/smoke.js
```

## Environment Variables

| Variable    | Default                 | Description                                       |
| ----------- | ----------------------- | ------------------------------------------------- |
| `API_URL`   | `http://localhost:2137` | Base URL of the Pluma API                         |
| `SDK_TOKEN` | _(empty)_               | SDK bearer token — skips snapshot checks if unset |

Get a token from the Admin UI: **Settings → SDK Tokens → Create token**.

For scaling and connection-pool notes see [`SCALING.md`](../SCALING.md).
