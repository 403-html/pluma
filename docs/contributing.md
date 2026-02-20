# Contributing to Pluma

Guidelines for contributing to the Pluma project.

## Development Principles

### Package Boundaries

Keep changes inside package boundaries. Share cross-package contracts via `@pluma/types`.

**Why**: This maintains clear separation of concerns and prevents tight coupling between packages.

### Schema Changes

If schema changes are introduced, commit generated migration files under `packages/db/prisma/migrations`.

**Why**: Migration files ensure consistent database state across environments and deployments.

## Before Opening a PR

Validate your changes with:

```bash
pnpm lint && pnpm test && pnpm build
```

This ensures:
- Code style is consistent
- Tests pass
- All packages build successfully

## Monorepo Architecture

Understanding the structure helps you contribute effectively:

- `apps/app` - Next.js UI for operators
- `apps/api` - Fastify API server (Admin + SDK routes)
- `packages/db` - Prisma + PostgreSQL schema, migrations, and client package
- `packages/sdk` - npm SDK package
- `packages/types` - shared TypeScript types and schemas

## API Planes

Pluma has two API planes:

- **Admin API** (`/api/v1/*`): authenticated management endpoints for projects, environments, flags, tokens, and config.
- **SDK API** (`/sdk/v1/*`): read-only snapshot endpoints authenticated with SDK tokens.

When making changes, consider which plane is affected and maintain backward compatibility where possible.

## Workflow Tips

### Working with Workspaces

Use pnpm workspace filters to work efficiently:

```bash
# Run a specific package's dev server
pnpm --filter @pluma/api dev

# Run tests for a specific package
pnpm --filter @pluma/sdk test

# Build a specific package
pnpm --filter @pluma/app build
```

### Database Changes

When modifying the database schema:

1. Update `packages/db/prisma/schema.prisma`
2. Generate migration:
   ```bash
   cd packages/db
   pnpm db:migrate
   ```
3. Commit both schema changes and generated migration files
4. Test migration on a fresh database to ensure it applies cleanly

## Code Quality

- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation when changing behavior
- Keep commits atomic and well-described
- Reference issues in commit messages when applicable

## Questions or Issues?

If you encounter problems or have questions:
- Check [Troubleshooting](troubleshooting.md) for common issues
- Open an issue on GitHub with details about your environment and the problem
