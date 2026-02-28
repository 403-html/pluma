# ============================================================
# apps/app/Dockerfile
#
# Multi-stage build for the Pluma Next.js 16 frontend.
# Build context MUST be the monorepo root:
#
#   docker build \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
#     -f apps/app/Dockerfile -t pluma-app .
#
# Build args:
#   NEXT_PUBLIC_API_URL — API base URL baked into the client bundle.
#                         Use the URL that end-users' browsers will reach.
#                         Defaults to http://localhost:2137 so the image
#                         builds without a real URL; override at build time
#                         for production images.
#
# Required env vars at runtime:
#   NEXT_PUBLIC_API_URL — also read by next.config.ts rewrites() at
#                         server start; must match the build-time value
#                         or a real production URL.
#   PORT               — (optional) HTTP port, defaults to 3000
# ============================================================

# pnpm version — single source of truth for all stages.
ARG PNPM_VERSION=10.29.3

# ─────────────────────────────────────────
# Stage 1 — deps
# Install the full workspace dependency tree.
# ─────────────────────────────────────────
FROM node:20-alpine AS deps

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

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

# @pluma/db postinstall runs `prisma generate`; copy the schema and
# helper script so it succeeds even without a real DATABASE_URL.
COPY packages/db/prisma/             ./packages/db/prisma/
COPY packages/db/scripts/            ./packages/db/scripts/

ENV DATABASE_URL=postgresql://placeholder

RUN pnpm install --frozen-lockfile


# ─────────────────────────────────────────
# Stage 2 — builder
# Build the Next.js application.
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Restore the full node_modules tree (virtual store + per-package trees).
COPY --from=deps /app/ ./

# Overlay source files; .dockerignore excludes node_modules so the
# directories restored above are not overwritten.
COPY . .

# next.config.ts throws if NEXT_PUBLIC_API_URL is empty or missing.
# Provide a placeholder that is replaced with a real URL at build time
# via --build-arg NEXT_PUBLIC_API_URL=https://api.example.com.
ARG NEXT_PUBLIC_API_URL=http://localhost:2137
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# next.config.ts uses transpilePackages: ['@pluma/types'], so Next.js
# reads @pluma/types TypeScript source directly via webpack — no
# separate build step is needed for this package before `next build`.
RUN pnpm --filter @pluma/app build


# ─────────────────────────────────────────
# Stage 3 — runner
# Minimal production image for `next start`.
# ─────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Pluma App"
LABEL org.opencontainers.image.description="Pluma feature-flag frontend (Next.js)"
LABEL org.opencontainers.image.source="https://github.com/403-html/pluma"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

ENV NODE_ENV=production
# Runtime value used by next.config.ts rewrites() on the server side.
# Note: NEXT_PUBLIC_API_URL is baked into the client bundle at build time
# (via the builder stage ARG). This ENV only affects server-side rewrites.
ENV NEXT_PUBLIC_API_URL=http://localhost:2137
ENV PORT=3000

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextuser

# ── pnpm virtual store ──────────────────────────────────────────────
# The root node_modules/.pnpm/ virtual store contains the actual
# package files that per-package symlink trees point into.
COPY --from=builder --chown=nextuser:nodejs /app/node_modules             ./node_modules

# ── Per-package node_modules for the app ────────────────────────────
# apps/app → next, react, react-dom, tailwindcss, radix-ui, recharts …
COPY --from=builder --chown=nextuser:nodejs /app/apps/app/node_modules    ./apps/app/node_modules

# ── Next.js build output ─────────────────────────────────────────────
# .next/ contains the pre-built server chunks and client bundles.
# @pluma/types is already bundled inside via transpilePackages — the
# packages/types/ source tree is NOT needed at runtime.
COPY --from=builder --chown=nextuser:nodejs /app/apps/app/.next           ./apps/app/.next

# ── Runtime configuration ────────────────────────────────────────────
# next.config.ts is read by `next start` to apply rewrites at runtime.
COPY --from=builder --chown=nextuser:nodejs /app/apps/app/next.config.ts  ./apps/app/next.config.ts
COPY --from=builder --chown=nextuser:nodejs /app/apps/app/package.json    ./apps/app/package.json
# pnpm needs the workspace root manifest to resolve the start script.
# Also copy packages/types source since next.config.ts uses transpilePackages.
COPY --from=builder --chown=nextuser:nodejs /app/package.json             ./package.json
COPY --from=builder --chown=nextuser:nodejs /app/pnpm-workspace.yaml      ./pnpm-workspace.yaml

USER nextuser

WORKDIR /app/apps/app

EXPOSE 3000

# Invoke next directly — no pnpm wrapper needed at runtime.
CMD ["node_modules/.bin/next", "start"]
