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

# Enable Corepack and activate the exact pnpm version declared in package.json.
# This must match `packageManager` in the root package.json.
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

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

# Prisma's postinstall hook (packages/db/scripts/generate.mjs) calls
# `prisma generate`.  Supply a placeholder URL so it succeeds without a
# real database available at build time.
ENV DATABASE_URL=postgresql://placeholder

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

# Regenerate the Prisma client (also ran via postinstall, but an explicit
# call here ensures we have the freshest client for the subsequent build).
RUN pnpm --filter @pluma/db db:generate

RUN pnpm --filter @pluma/db build

# tsc --noEmit + esbuild bundle → apps/api/dist/index.js
RUN pnpm --filter @pluma/api build

# ── Create the pruned production deployment directory ─────────────────────
# pnpm deploy copies the package files and installs only production deps,
# replacing workspace:* references with their built local packages.
RUN pnpm --filter @pluma/api deploy --prod /app/deploy

# ── Augment the deployment directory ─────────────────────────────────────
# 1. Copy Prisma schema + migrations into the deployment directory so that:
#    - prisma generate (next step) can locate the schema
#    - prisma migrate deploy (entrypoint) can locate the migration files
RUN cp -r packages/db/prisma /app/deploy/prisma

# 2. Regenerate the Prisma client inside the deployment directory.
#    pnpm deploy --prod creates a fresh node_modules without the generated
#    artefacts.  Running generate with the schema at
#    /app/deploy/prisma/schema.prisma causes Prisma to write the client to
#    ../node_modules/.prisma/client → /app/deploy/node_modules/.prisma/client
#    (the default output is relative to the prisma/ directory).
RUN set -e; \
    PRISMA_BIN=$(find node_modules/.pnpm \
        -maxdepth 5 \
        -path "*/prisma@*/node_modules/prisma/build/index.js" \
        | head -1); \
    [ -n "$PRISMA_BIN" ] || \
        { echo "ERROR: prisma CLI not found in pnpm virtual store"; exit 1; }; \
    cd /app/deploy && \
    DATABASE_URL=postgresql://placeholder node "$PRISMA_BIN" generate \
        --schema ./prisma/schema.prisma

# 3. Copy the prisma CLI package from the pnpm virtual store into the
#    deployment directory so the entrypoint can run `prisma migrate deploy`.
#    (prisma is a devDep and therefore excluded from --prod.)
RUN set -e; \
    PRISMA_PKG=$(find node_modules/.pnpm \
        -maxdepth 3 \
        -path "*/prisma@*/node_modules/prisma" \
        -type d \
        | head -1); \
    [ -n "$PRISMA_PKG" ] || \
        { echo "ERROR: prisma package not found in pnpm virtual store"; exit 1; }; \
    cp -r "$PRISMA_PKG" /app/deploy/node_modules/prisma; \
    # Create a portable bin wrapper using an absolute path.  The WORKDIR in
    # the runner stage is always /app, so this path is stable and unambiguous.
    printf '#!/bin/sh\nexec node /app/node_modules/prisma/build/index.js "$@"\n' \
        > /app/deploy/node_modules/.bin/prisma; \
    chmod +x /app/deploy/node_modules/.bin/prisma

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

CMD ["./docker-entrypoint.sh"]
