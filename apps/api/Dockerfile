# ============================================================
# apps/api/Dockerfile
#
# Multi-stage build for the Pluma API (Fastify).
# Build context MUST be the monorepo root:
#
#   docker build -f apps/api/Dockerfile -t pluma-api .
#
# Required env vars at runtime:
#   DATABASE_URL  — PostgreSQL connection string
#                   e.g. postgresql://pluma:pluma@postgres:5432/pluma?schema=public
#   PORT          — (optional) HTTP port, defaults to 2137
#   HOST          — (optional) bind address, defaults to 0.0.0.0
#
# The API bundle is produced by esbuild with packages:external, so
# all node_modules (including workspace packages @pluma/db and
# @pluma/types) are resolved from node_modules at runtime.
# ============================================================

# ─────────────────────────────────────────
# Stage 1 — deps
# Install the full workspace dependency tree.
# ─────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy workspace manifests — pnpm needs every package.json in the
# workspace to resolve the lock file correctly.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

COPY apps/api/package.json           ./apps/api/package.json
COPY apps/app/package.json           ./apps/app/package.json
COPY apps/storybook/package.json     ./apps/storybook/package.json
COPY packages/db/package.json        ./packages/db/package.json
COPY packages/sdk/package.json       ./packages/sdk/package.json
COPY packages/types/package.json     ./packages/types/package.json

# @pluma/db has a postinstall that runs `prisma generate`.
# Copy the schema and the helper script so it can succeed.
COPY packages/db/prisma/             ./packages/db/prisma/
COPY packages/db/scripts/            ./packages/db/scripts/

# Provide a placeholder URL so prisma generate works without a real DB.
ENV DATABASE_URL=postgresql://placeholder

RUN pnpm install --frozen-lockfile


# ─────────────────────────────────────────
# Stage 2 — builder
# Build workspace packages in dependency order, then the API.
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Restore the full node_modules tree from the deps stage.
# This includes the pnpm virtual store (node_modules/.pnpm/) and
# every per-workspace-package node_modules/ directory created by pnpm
# in isolated mode.
COPY --from=deps /app/ ./

# Overlay source files on top.
# .dockerignore ensures no node_modules from the host overwrite the
# directories we just brought in from the deps stage.
COPY . .

# Re-export the placeholder so `prisma generate` (called inside the
# API build script) doesn't fail without a real DATABASE_URL.
ENV DATABASE_URL=postgresql://placeholder

# 1. Build @pluma/types — produces packages/types/dist/index.js.
#    tsc resolves @pluma/types via the "types" export condition (src/index.ts)
#    so this step is NOT required for TypeScript compilation of @pluma/db.
#    It IS required at runtime: packages/db/dist/index.js imports @pluma/types
#    via the "default" export condition (dist/index.js), and the API esbuild
#    bundle leaves @pluma/types external — so the dist must exist in the runner.
RUN pnpm --filter @pluma/types build

# 2. Build @pluma/db — produces packages/db/dist/index.js.
#    tsc resolves @pluma/types types from src/index.ts (no dist needed for compilation).
RUN pnpm --filter @pluma/db build

# 3. Build the API — mirrors the exact local build command:
#    pnpm --filter @pluma/db db:generate && tsc --noEmit && node ../../tooling/esbuild/build.mjs
#    Output: apps/api/dist/index.js
RUN pnpm --filter @pluma/api build


# ─────────────────────────────────────────
# Stage 3 — runner
# Minimal production image. Copy only runtime artefacts.
# ─────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Pluma API"
LABEL org.opencontainers.image.description="Pluma feature-flag API server (Fastify)"
LABEL org.opencontainers.image.source="https://github.com/403-html/pluma"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

ENV NODE_ENV=production
# Default port matching .env.example convention; override with -e PORT=<n>
ENV PORT=2137
ENV HOST=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 apiuser

# ── pnpm virtual store ──────────────────────────────────────────────
# The pnpm virtual store (node_modules/.pnpm/) holds actual package
# files; per-package node_modules/ directories hold the symlinks that
# point into it.  We need both the root store and the per-package
# symlink trees for the full import graph to resolve correctly.
COPY --from=builder --chown=apiuser:nodejs /app/node_modules              ./node_modules

# ── Per-package node_modules symlink trees ──────────────────────────
# apps/api  → fastify, zod, dotenv … (direct API deps)
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/node_modules     ./apps/api/node_modules
# packages/db → @prisma/client, @prisma/adapter-pg, pg, bcryptjs …
COPY --from=builder --chown=apiuser:nodejs /app/packages/db/node_modules  ./packages/db/node_modules

# ── Workspace package compiled outputs ──────────────────────────────
# @pluma/db  — imported at runtime because esbuild used packages:external
COPY --from=builder --chown=apiuser:nodejs /app/packages/db/dist          ./packages/db/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages/db/package.json  ./packages/db/package.json

# @pluma/types — imported transitively by packages/db/dist/index.js
COPY --from=builder --chown=apiuser:nodejs /app/packages/types/dist       ./packages/types/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages/types/package.json ./packages/types/package.json

# ── API build output ─────────────────────────────────────────────────
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist             ./apps/api/dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package.json     ./apps/api/package.json

USER apiuser

# node dist/index.js resolves imports by walking up to /app/node_modules
WORKDIR /app/apps/api

EXPOSE 2137

# /health is registered unconditionally in src/app.ts.
# wget is provided by BusyBox in node:20-alpine; -qO /dev/null discards
# the response body and exits non-zero on any network or HTTP error.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget -qO /dev/null http://localhost:${PORT:-2137}/health || exit 1

CMD ["node", "dist/index.js"]
