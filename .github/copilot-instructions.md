# Copilot Instructions for Pluma

## Repository Overview

**Build Pluma: a self-hosted feature flag system.**

Two planes:
- **Admin API** (`/api/v1/*`) → CRUD + config + SDK tokens (human session auth)
- **SDK API** (`/sdk/v1/*`) → read-only snapshot (Bearer SDK token)

Pluma is a monorepo built with pnpm workspaces containing a Next.js UI, Fastify API server, and shared packages for SDK, types, and database management with Prisma ORM and PostgreSQL.

## Project Structure

```
pluma/
├── apps/
│   ├── app/          # Next.js 16 UI application (React 19)
│   └── api/          # Fastify API server
├── packages/
│   ├── db/           # Prisma ORM + PostgreSQL with migrations
│   ├── sdk/          # npm SDK package (public)
│   └── types/        # Shared TypeScript types and schemas
└── tooling/          # Shared ESLint and TypeScript configs
```

## Tech Stack

- **Package Manager**: pnpm (v10.29.3+)
- **Runtime**: Node.js
- **Language**: TypeScript 5.9.3
- **UI Framework**: Next.js 16.1.6 with React 19
- **API Framework**: Fastify 5.7.4
- **Database**: PostgreSQL 16 with Prisma 7.4.0
- **Testing**: Vitest 4.0.18
- **Linting**: ESLint 10.0.0
- **Schema Validation**: Zod 4.3.6

## Development Workflow

### Setup

```bash
# Install dependencies
pnpm install

# Set up database (Docker)
cd packages/db
docker-compose up -d
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed  # Optional
```

### Running Development Servers

```bash
# Run all apps in dev mode
pnpm dev

# Run specific app
cd apps/app && pnpm dev    # Next.js UI on port 3000
cd apps/api && pnpm dev    # Fastify API (check .env for port)
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/sdk && pnpm build
```

### Linting and Testing

```bash
# Lint all code
pnpm lint

# Run tests
pnpm test

# Test specific package
cd apps/api && pnpm test
cd packages/sdk && pnpm test
```

## Code Organization

### Workspace Dependencies

- Use `workspace:*` for internal package dependencies
- All packages use `@pluma/*` naming convention
- Import from workspace packages: `import { prisma } from '@pluma/db'`

### TypeScript

- Use strict TypeScript configuration
- Export types from `@pluma/types` package
- Avoid `any` types; prefer proper typing
- Use `.ts` extension for all TypeScript files (ES modules)

### File Structure

- `src/` - Source code for all packages
- `dist/` - Compiled output (gitignored)
- `.env.example` - Template for environment variables
- `eslint.config.js` - ESLint configuration
- `tsconfig.json` - TypeScript configuration

## Code Rules

These rules are mandatory for all new code.

**1️⃣ Restrict Control Flow**
- Use only simple constructs (if, switch, for, while, try/catch)
- No recursion (direct or indirect)
- No clever flow tricks

**2️⃣ Fixed Loop Bounds**
- All loops must have a statically obvious upper bound (prefer .map/.forEach/.reduce)
- Enforce explicit max sizes on external inputs

**3️⃣ No Unbounded Dynamic Allocation**
- Avoid unbounded in-memory growth
- Enforce max collection sizes
- No accumulating uncontrolled arrays

**4️⃣ Function Length Limit**
- Max ~60 lines per function
- Split responsibilities aggressively

**5️⃣ Assertion Density**
- Minimum 2 assertions per function in core logic
- Assertions must be side-effect free
- On failure, return explicit error

**6️⃣ Smallest Scope**
- Declare variables at smallest scope
- Avoid module-level mutable state unless documented

**7️⃣ Check Inputs & Outputs**
- Validate all external inputs (e.g., Zod)
- Never ignore return values or Promises
- Validate parameters in called functions

**8️⃣ No Preprocessor-Like Tricks**
- Avoid build-time hacks
- Minimal conditional logic based on env
- No magic global replacements

**9️⃣ Restrict Indirection**
- No dynamic dispatch chains
- Avoid decorators/proxy magic for core logic
- Keep logic traceable

**🔟 Pedantic Compilation**
- TypeScript strict mode enabled
- Zero TS errors
- Zero lint warnings
- Static analysis in CI
- Explicit types at boundaries

### Copilot Behavior Rules

- Prefer small vertical slices
- Keep changes deterministic
- Update SDK + API together if snapshot changes
- Add tests for new logic
- Never silently violate invariants
- Do not invent endpoints outside this contract

## Coding Conventions

### General

- Use ES modules (`type: "module"` in package.json)
- Use modern JavaScript/TypeScript features
- Follow existing code style (ESLint will catch issues)
- Write clear, self-documenting code with minimal comments — only when they explain WHY, not WHAT. This applies equally to all Copilot assets (skills, agent files, `copilot-instructions.md`).

### Database (Prisma)

- Schema changes:
  1. Edit `prisma/schema.prisma`
  2. Run `pnpm db:generate` (regenerate types)
  3. Run `pnpm db:migrate` (create migration)
- Quick dev: Use `pnpm db:push` (no migration files)
- Always import from `@pluma/db`: `import { prisma } from '@pluma/db'`
- Use Prisma Client for all database operations

### API Development (Fastify)

- Use Fastify plugins for route organization
- Apply middleware: CORS, Helmet, Sensible
- Use Zod for request/response validation
- Import types from `@pluma/types`
- Use async/await for async operations

### UI Development (Next.js)

- Use Next.js App Router (not Pages Router)
- React Server Components by default
- Client components: Add `'use client'` directive
- Import types from `@pluma/types`
- Follow React 19 best practices

### SDK Development

- Write clean, well-typed public APIs
- Include JSDoc comments for public exports
- Export from `src/index.ts`
- Keep dependencies minimal

## Testing

- Write tests in `*.test.ts` files
- Use Vitest for testing
- Test files should be co-located with source code
- Focus on unit tests for SDK and integration tests for API

## Environment Variables

- Never commit `.env` files
- Always provide `.env.example` templates
- Document all required environment variables
- Use `dotenv` for loading environment variables

## Database Workflows

### Schema Changes

```bash
# Development (with migrations)
pnpm db:generate && pnpm db:migrate

# Development (quick, no migrations)
pnpm db:push

# Production migration
pnpm db:migrate:deploy
```

### Database Tools

```bash
pnpm db:studio    # Visual database browser at localhost:5555
pnpm db:seed      # Seed database with initial data
```

## Common Tasks

### Adding a New Workspace Package

1. Create directory in `apps/` or `packages/`
2. Add `package.json` with `@pluma/*` name
3. Add to `pnpm-workspace.yaml` if needed (usually automatic)
4. Run `pnpm install --no-frozen-lockfile` at root — this updates `pnpm-lock.yaml`; commit it alongside the new package. Omitting this step causes `ERR_PNPM_OUTDATED_LOCKFILE` in CI.

### Adding Dependencies

```bash
# Root dev dependencies
pnpm add -D <package> -w

# Workspace package dependency
cd apps/api && pnpm add <package>

# Workspace dependency
pnpm add @pluma/types --filter @pluma/api
```

### Working with Prisma

- Schema: `packages/db/prisma/schema.prisma`
- Migrations: `packages/db/prisma/migrations/`
- Seed: `packages/db/prisma/seed.ts`
- Config: `packages/db/prisma.config.ts` (Prisma 7 feature)

## Best Practices

1. **Monorepo**: Respect package boundaries; avoid circular dependencies
2. **Types**: Share types via `@pluma/types` package
3. **Database**: Always generate Prisma Client after schema changes
4. **Testing**: Run tests before committing
5. **Linting**: Fix ESLint errors before committing
6. **Builds**: Ensure all packages build successfully
7. **Environment**: Check `.env.example` files for required configuration
8. **Git**: Don't commit `dist/`, `node_modules/`, `.env`, or `.next/`

## Troubleshooting

- **Type errors**: Run `pnpm db:generate` after schema changes
- **Import errors**: Run `pnpm install` and check workspace dependencies
- **Build errors**: Check `tsconfig.json` and ensure all dependencies are built
- **Database errors**: Check Docker is running and `.env` is configured
- **Port conflicts**: Check if ports are already in use

## Getting Help

- Check package README files for specific documentation
- Review `package.json` scripts for available commands
- Consult Prisma, Next.js, and Fastify documentation

## CI/CD

CI runs on GitHub Actions. The pipeline executes on every push and PR.

**Key pipeline steps (in order):**
1. `pnpm install` — install all workspace dependencies
2. `pnpm lint` — ESLint across the full monorepo
3. `pnpm -r build` — build all packages (type-check included)
4. `pnpm -r test` — run all Vitest suites (API + SDK); a PostgreSQL service container is provisioned automatically

**Deployment:**
- Migrations are applied in CI/CD via `pnpm --filter @pluma/db db:migrate:deploy` (never `db:migrate` in production — it prompts interactively).
- Environment variables in CI mirror `.env.example` defaults; override via GitHub Actions secrets/environment variables.

**Local parity:**
- All pipeline commands are identical to local commands — no CI-only scripts exist.
- If a step fails in CI but passes locally, check that `.env` values match the CI environment and that `pnpm -r build` succeeds before testing.
- To validate workflow changes locally before pushing, see the `testing-workflows-locally` skill (`act push -j <job>`).

## Debugging

For full debugging workflows see the `debugging-locally` skill. Quick reference:

**Structured logs (first resort):**
```bash
pnpm --filter @pluma/api dev | pino-pretty   # pretty-print JSON logs
pnpm --filter @pluma/api dev 2>&1 | jq .     # parse with jq
DEBUG="prisma:query" pnpm --filter @pluma/api dev   # log every SQL statement
```

**Breakpoint debugging (Node.js inspector):**
```bash
NODE_OPTIONS="--inspect" pnpm --filter @pluma/api dev  # binds inspector to 127.0.0.1:9229
```
Attach VS Code via `.vscode/launch.json` with `"request": "attach"` on port `9229`. Source maps are active; breakpoints hit `.ts` lines directly.

**SDK / test debugging:**
```bash
cd packages/sdk && pnpm vitest --reporter=verbose
node --inspect-brk --loader tsx/esm node_modules/.bin/vitest run  # pause on first line
```
