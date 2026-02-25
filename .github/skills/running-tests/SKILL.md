---
name: running-tests
description: Canonical guide for running all test types in Pluma — unit, integration, and SDK
---

This skill documents how to run every test suite in the Pluma monorepo. Tests use **Vitest 4**. API integration tests require a live PostgreSQL database.

## Test Inventory

| Suite | Location | Type | DB required |
|---|---|---|---|
| API tests | `apps/api/src/tests/*.test.ts` (12 files) | Integration | ✅ Yes |
| SDK tests | `packages/sdk/src/index.test.ts` | Unit | ❌ No |

## Prerequisites

- Dependencies installed (`pnpm install`)
- For API tests: PostgreSQL running and migrations applied (see `local-dev-setup` skill)
- `.env` files in place for `packages/db/` and `apps/api/`

## Running All Tests

```bash
# Run every test suite in the monorepo
pnpm -r test
```

This runs `test` scripts across all workspace packages that define one.

## Running Tests by Package

```bash
# API integration tests only
pnpm --filter @pluma/api test

# SDK unit tests only
pnpm --filter @pluma/sdk test
```

## Running a Single Test File

```bash
# From the package directory
cd apps/api
pnpm vitest run src/tests/<filename>.test.ts

cd packages/sdk
pnpm vitest run src/index.test.ts
```

## Running Tests in Watch Mode

```bash
# Watch a specific package during development
cd apps/api && pnpm vitest

cd packages/sdk && pnpm vitest
```

Vitest re-runs affected tests on every file save.

## Running Tests with Coverage

```bash
cd apps/api && pnpm vitest run --coverage

cd packages/sdk && pnpm vitest run --coverage
```

Coverage reports are written to `coverage/` in each package directory.

## API Test Requirements

API tests hit a real PostgreSQL database. Before running:

```bash
# 1. Ensure Docker DB is up
cd packages/db && docker-compose up -d

# 2. Apply migrations
pnpm --filter @pluma/db db:migrate

# 3. Run tests
pnpm --filter @pluma/api test
```

If tests fail with database connection errors, verify `apps/api/.env` contains the correct `DATABASE_URL`.

## Interpreting Output

- **PASS** — all assertions passed
- **FAIL** — assertion failure; Vitest prints the diff and stack trace
- **SKIP** — test marked `.skip`; not an error

Exit code `0` = all tests passed. Any non-zero exit code = failure.

## CI Behaviour

In CI, `pnpm -r test` runs against a provisioned PostgreSQL service container. The same commands work locally and in CI — no separate CI-only test commands exist.

## When to Invoke This Skill

Invoke this skill when:
- Verifying a feature branch before opening a PR
- Debugging a test failure in CI
- Adding a new test file and confirming it is picked up correctly
- Onboarding contributors who need to run the test suite for the first time
