---
name: running-tests
description: Canonical guide for running all test types in Pluma — unit, integration, and SDK
---

This skill documents how to run every test suite in the Pluma monorepo. Tests use **Vitest 4**. All API tests mock `@pluma/db` via `vi.hoisted`/`vi.mock` and use `app.inject` — no live database is required to run them.

## Test Inventory

| Suite | Location | Type | DB required |
|---|---|---|---|
| API tests | `apps/api/src/tests/*.test.ts` (11 files) | Unit (Prisma mocked) | ❌ No |
| SDK tests | `packages/sdk/src/index.test.ts` | Unit | ❌ No |

## Prerequisites

- Dependencies installed (`pnpm install`)

## Running All Tests

```bash
pnpm -r test
```

This runs `test` scripts across all workspace packages that define one.

## Running Tests by Package

```bash
pnpm --filter @pluma/api test

pnpm --filter @pluma/sdk test
```

## Running a Single Test File

```bash
cd apps/api
pnpm vitest run src/tests/<filename>.test.ts

cd packages/sdk
pnpm vitest run src/index.test.ts
```

## Running Tests in Watch Mode

```bash
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

## Interpreting Output

- **PASS** — all assertions passed
- **FAIL** — assertion failure; Vitest prints the diff and stack trace
- **SKIP** — test marked `.skip`; not an error

Exit code `0` = all tests passed. Any non-zero exit code = failure.

## CI Behaviour

In CI, `pnpm -r test` runs in the `test` job. The PostgreSQL service container is provisioned for the migration step (`db:migrate:deploy`), not for the tests themselves.

## When to Invoke This Skill

Invoke this skill when:
- Verifying a feature branch before opening a PR
- Debugging a test failure in CI
- Adding a new test file and confirming it is picked up correctly
- Onboarding contributors who need to run the test suite for the first time
