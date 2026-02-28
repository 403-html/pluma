# syntax=docker/dockerfile:1
# =============================================================================
# Pluma API — production Docker image
#
# Build stages
#   base     → shared Alpine + Corepack + pnpm foundation
#   deps     → workspace manifests + lockfile → pnpm install (all deps)
#   builder  → full source overlay → build types/db/api → pnpm deploy --prod
#   runner   → minimal Alpine runtime with the pruned deployment directory
#
# Usage
#   docker build -f apps/api/Dockerfile -t pluma-api .
#   docker run -e DATABASE_URL=<url> -p 2137:2137 pluma-api
#
# Required environment variables at runtime
#   DATABASE_URL  PostgreSQL connection string (e.g. postgresql://user:pass@host/db)
# =============================================================================

# ─── Stage: base ─────────────────────────────────────────────────────────────
# Shared foundation: Alpine Node.js with Corepack and the pinned pnpm version.
FROM node:22-alpine AS base

# Enable Corepack so that pnpm is resolved from the `packageManager` field
# in the root package.json — single source of truth, no hardcoded version.
RUN corepack enable

WORKDIR /app

# ─── Stage: deps ─────────────────────────────────────────────────────────────
# Install the full workspace dependency graph (including devDeps) so the builder
# stage has every tool it needs.  Only manifest files are copied here so that
# this layer is invalidated only when the lockfile or a package.json changes.
FROM base AS deps

# Root workspace files
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Every workspace package's manifest — pnpm needs all of them for
# workspace:* resolution, even packages excluded from the image later.
COPY --link apps/api/package.json         ./apps/api/
COPY --link apps/app/package.json         ./apps/app/
COPY --link apps/storybook/package.json   ./apps/storybook/
COPY --link packages/db/package.json      ./packages/db/
COPY --link packages/sdk/package.json     ./packages/sdk/
COPY --link packages/types/package.json   ./packages/types/
COPY --link tooling/eslint/package.json   ./tooling/eslint/

# packages/db postinstall runs `node scripts/generate.mjs` which calls
# `prisma generate` — both the script and the schema must be present.
COPY --link packages/db/scripts/          ./packages/db/scripts/
COPY --link packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

# Prisma's postinstall hook (packages/db/scripts/generate.mjs) calls
# `prisma generate`.  Supply a placeholder URL so it succeeds without a
# real database available at build time.
ENV DATABASE_URL=postgresql://placeholder

# Install ALL dependencies (including devDeps) — the builder stage needs
# tsc, tsx, and esbuild to compile the workspace packages.
RUN pnpm install --frozen-lockfile

# ─── Stage: builder ──────────────────────────────────────────────────────────
# Compile all workspace packages and produce the pruned deployment directory.
FROM base AS builder

# Seed the workspace with the installed node_modules from the deps stage.
COPY --from=deps /app ./

# Overlay the full source tree on top (node_modules and dist excluded by
# .dockerignore so they never overwrite the installed/generated content).
COPY --link . .

# Prisma generate runs again during the explicit db:generate step below.
ENV DATABASE_URL=postgresql://placeholder

# ── Build workspace packages in dependency order ──────────────────────────
RUN pnpm --filter @pluma/types build

# Regenerate the Prisma client (also ran via postinstall, but the explicit
# call here ensures we use the client version aligned with the full source
# overlay applied in this builder stage).
RUN pnpm --filter @pluma/db db:generate

RUN pnpm --filter @pluma/db build

# tsc --noEmit + esbuild bundle → apps/api/dist/index.js
RUN pnpm --filter @pluma/api build

# ── Create the pruned production deployment directory ─────────────────────
# pnpm deploy copies the package files and installs only production deps,
# replacing workspace:* references with their built local packages.
# --legacy is required in pnpm v10+ for workspaces without inject-workspace-packages=true.
RUN pnpm --filter @pluma/api deploy --prod --legacy /app/deploy

# ── Augment the deployment directory ─────────────────────────────────────
# Copy Prisma schema + migrations so that prisma migrate deploy
# (entrypoint) can locate the migration files at runtime.
RUN cp -r packages/db/prisma /app/deploy/prisma

# Copy the already-generated Prisma client into the deployment directory.
# pnpm deploy --prod creates a fresh node_modules but does NOT re-run
# prisma generate.  With pnpm's virtual-store layout, the generated client
# lives INSIDE the store entry for @prisma/client, not at the workspace root:
#
#   packages/db/node_modules/@prisma/client  (symlink)
#     → node_modules/.pnpm/@prisma+client@<ver>/node_modules/@prisma/client
#
# Going up two dirname levels reaches the store's node_modules/ directory,
# where .prisma/client sits as a sibling of @prisma/.
# Expected layout after `prisma generate`:
#   node_modules/.pnpm/@prisma+client@<ver>/node_modules/.prisma/client/
#
# The copy targets /app/deploy/node_modules/.prisma so that at runtime
# @prisma/client can resolve the bare specifier `.prisma/client/default`
# by walking up the node_modules tree to /app/deploy/node_modules/.prisma.
RUN src=$(readlink -f packages/db/node_modules/@prisma/client) && \
    prisma_dir="$(dirname "$(dirname "$src")")/.prisma" && \
    [ -d "$prisma_dir" ] || { echo "ERROR: $prisma_dir not found — was prisma generate run?"; exit 1; } && \
    cp -r "$prisma_dir" /app/deploy/node_modules/.prisma

# ─── Stage: runner ───────────────────────────────────────────────────────────
# Minimal Alpine image containing only what is needed to serve traffic.
FROM node:22-alpine AS runner

LABEL org.opencontainers.image.title="Pluma API"
LABEL org.opencontainers.image.description="Pluma feature flag API server"
LABEL org.opencontainers.image.source="https://github.com/403-html/pluma"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

ENV NODE_ENV=production

# Copy the pruned deployment directory from the builder stage.
# This includes: dist/, node_modules/ (prod only + prisma CLI), prisma/,
# and package.json.
COPY --from=builder --chown=node:node /app/deploy ./

# Copy the entrypoint script and make it executable.
COPY --link --chown=node:node apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node

EXPOSE 2137

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e \
        "require('http').get('http://localhost:2137/health', \
        (r) => process.exit(r.statusCode === 200 ? 0 : 1)) \
        .on('error', () => process.exit(1))"
# The /health endpoint is defined in apps/api/src/app.ts and returns HTTP 200.

CMD ["./docker-entrypoint.sh"]
