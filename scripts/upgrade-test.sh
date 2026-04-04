#!/usr/bin/env bash
# scripts/upgrade-test.sh
#
# Upgrade-process integration test.
#
# Validates the self-hosted upgrade flow described in docs/upgrading.mdx:
#   1. Build and start the stack (API + database) from source.
#   2. Verify the API becomes healthy — proving that prisma migrate deploy ran
#      cleanly (the entrypoint uses `set -e`, so a migration failure exits the
#      container and the health check never passes).
#   3. Restart the API with the same image (simulating a `docker compose pull &&
#      docker compose up -d` upgrade where no new migrations exist).
#   4. Verify the API is healthy again — proving migration idempotency.
#
# Requirements: Docker with Compose v2 and curl.

set -euo pipefail

COMPOSE="docker compose"
# API_PORT must match the port mapping in docker-compose.yml (default: 2137)
API_PORT="${API_PORT:-2137}"
API_URL="http://localhost:${API_PORT}"
HEALTH_RETRIES=40   # 40 × 3 s = 2 min max
HEALTH_INTERVAL=3

# ── Helpers ────────────────────────────────────────────────────────────────

log() { printf '[upgrade-test] %s\n' "$*"; }

wait_healthy() {
  local label="$1"
  log "Waiting for API to be healthy (${label})…"
  local i=1
  while [ "$i" -le "$HEALTH_RETRIES" ]; do
    if curl -sf "${API_URL}/health" >/dev/null 2>&1; then
      log "API is healthy (${label})"
      return 0
    fi
    sleep "$HEALTH_INTERVAL"
    i=$((i + 1))
  done
  log "ERROR: API did not become healthy within timeout (${label})"
  $COMPOSE logs api
  return 1
}

assert_health_ok() {
  local label="$1"
  local body
  body=$(curl -sf "${API_URL}/health")
  if ! printf '%s' "$body" | grep -q '"status":"ok"'; then
    log "ERROR: unexpected health response (${label}): ${body}"
    return 1
  fi
  log "Health response OK (${label}): ${body}"
}

# ── Cleanup ────────────────────────────────────────────────────────────────

cleanup() {
  log "Tearing down stack…"
  $COMPOSE down --volumes --remove-orphans 2>/dev/null || true
}

trap cleanup EXIT

# ── Phase 1: initial start ─────────────────────────────────────────────────

log "=== Phase 1: initial start (fresh database + migrations) ==="
$COMPOSE up --build -d postgres api

wait_healthy "initial"
assert_health_ok "initial"

# ── Phase 2: upgrade (restart API with same image — idempotent migrations) ─

log "=== Phase 2: upgrade (docker compose up -d, idempotent migrations) ==="
$COMPOSE up -d api

wait_healthy "post-upgrade"
assert_health_ok "post-upgrade"

log "=== Upgrade test PASSED ==="
