---
name: pre-review-checklist
description: Mandatory pre-PR validation checklist for all Pluma agents — lint, build, test, and hygiene checks before opening or updating a pull request
---

This skill defines the mandatory checks that MUST pass before any agent opens a PR or requests review. Run these checks in order; stop and fix failures before proceeding.

## When to Run This Checklist

Run this checklist:
- Before opening a new PR
- After addressing review feedback and pushing an update
- Before marking a PR as ready for review (removing draft status)

## Full Checklist

### 1. Lint — Zero Warnings, Zero Errors

```bash
pnpm lint
```

Expected output: no errors, no warnings. If failures appear, fix them and re-run before continuing.

For targeted lint (single package):

```bash
pnpm --filter @pluma/api lint
pnpm --filter @pluma/app lint
```

### 2. Build — All Packages Compile

```bash
pnpm -r build
```

This runs TypeScript type-checking and produces `dist/` output for every package. Any type error or import resolution failure will surface here.

For targeted build:

```bash
pnpm --filter @pluma/api build    # API (includes type-check)
pnpm --filter @pluma/app build    # Next.js UI
pnpm --filter @pluma/sdk build    # SDK
```

### 3. Tests — All Suites Pass

Invoke the `running-tests` skill for the full procedure. Minimum required:

```bash
pnpm --filter @pluma/api test

pnpm --filter @pluma/sdk test
```

All API tests mock `@pluma/db` via `vi.hoisted`/`vi.mock` — no live database is needed to run them.

All tests must exit with code `0`. No skipped tests should be introduced without explicit justification.

### 4. No Secrets or Generated Files Committed

```bash
git status
```

Verify the staging area contains **only** source files. The following must NOT appear in the diff:

| File / pattern | Why forbidden |
|---|---|
| `.env` (any variant) | Contains credentials |
| `dist/` | Generated build output |
| `node_modules/` | Dependencies |
| `.next/` | Next.js build cache |
| `coverage/` | Test coverage output |
| `*.log` | Runtime logs |

If any of these appear: `git restore --staged <file>` and add them to `.gitignore` if missing.

### 5. Correct Branch Target

Confirm the PR targets `main`. Feature branches should never target other feature branches unless the work is explicitly staged.

## Scope-Specific Shortcuts

| Scope changed | Minimum checks |
|---|---|
| API only (`apps/api/`) | `pnpm --filter @pluma/api lint && pnpm --filter @pluma/api build && pnpm --filter @pluma/api test` |
| UI only (`apps/app/`) | `pnpm --filter @pluma/app lint && pnpm --filter @pluma/app build` |
| SDK only (`packages/sdk/`) | `pnpm --filter @pluma/sdk lint && pnpm --filter @pluma/sdk build && pnpm --filter @pluma/sdk test` |
| DB schema (`packages/db/`) | `pnpm --filter @pluma/db db:generate` then full build + test |
| Shared types (`packages/types/`) | `pnpm -r build` (all dependents must still compile) |
| Workflows (`.github/workflows/`) | Invoke `testing-workflows-locally` skill; run `act push -j <job>` locally |
| Multiple packages | Run full `pnpm lint && pnpm -r build && pnpm -r test` |

## Fast-Fail Diagnostics

| Failure | Likely cause | Fix |
|---|---|---|
| Lint: `Parsing error` | TypeScript syntax error | Fix the syntax; check imports |
| Lint: `no-unused-vars` | Declared but unused variable | Remove or use the variable |
| Build: `Type error` | Type mismatch or missing import | Fix types; run `pnpm --filter @pluma/db db:generate` if schema changed |
| Build: `Cannot find module` | Missing dependency or workspace link | Run `pnpm install` at root |
| Test: `Cannot connect to database` | PostgreSQL not running | Start DB: `cd packages/db && docker-compose up -d` |
| Test: auth returns 401 | Session mock not set | Add `prismaMock.session.findUnique.mockResolvedValue(mockSession)` to `beforeEach` |
| Test: `vi.hoisted` error | Prisma mock not using `vi.hoisted` | Wrap mock declaration in `vi.hoisted(() => { ... })` |

## Definition of Ready

A PR is ready for review when:

- [ ] `pnpm lint` exits `0`
- [ ] `pnpm -r build` exits `0`
- [ ] All relevant test suites exit `0`
- [ ] No `.env`, `dist/`, `node_modules/`, `.next/` in the diff
- [ ] PR targets `main`
- [ ] PR description summarises what changed and why

## When to Invoke This Skill

Invoke this skill:
- As the final step before any PR is opened or marked ready for review
- Any time CI fails and you need to reproduce the failure locally
- When onboarding to a new task and validating the baseline is clean
