# syntax=docker/dockerfile:1
# apps/app/Dockerfile
#
# Multi-stage build for the Pluma Next.js 16 frontend.
# Build context MUST be the monorepo root:
#
#   docker build -f apps/app/Dockerfile -t pluma-app .
#
# The image is environment-agnostic: no API URL is baked in at build time.
# Provide API_URL at container runtime:
#
#   docker run -e API_URL=https://api.example.com -p 3000:3000 pluma-app
#
# Required env vars at runtime:
#   API_URL — base URL of the Pluma API, used by Next.js server-side route
#             handlers. The value is never sent to the browser.
#   PORT    — (optional) HTTP port, defaults to 3000

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.29.3

# ─────────────────────────────────────────
# Stage 1 — base
# Shared corepack + pnpm setup for build stages.
# ─────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

# ─────────────────────────────────────────
# Stage 2 — deps
# Install the full workspace dependency tree.
# ─────────────────────────────────────────
FROM base AS deps

# Copy workspace manifests — pnpm needs every package.json in the
# workspace to resolve the lock file correctly.
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

COPY --link apps/api/package.json         ./apps/api/
COPY --link apps/app/package.json         ./apps/app/
COPY --link apps/storybook/package.json   ./apps/storybook/
COPY --link packages/db/package.json      ./packages/db/
COPY --link packages/sdk/package.json     ./packages/sdk/
COPY --link packages/types/package.json   ./packages/types/
COPY --link tooling/eslint/package.json   ./tooling/eslint/

# @pluma-flags/db postinstall runs `prisma generate`; copy the schema and
# helper script so it succeeds even without a real DATABASE_URL.
COPY --link packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma
COPY --link packages/db/scripts/             ./packages/db/scripts/

ENV DATABASE_URL=postgresql://placeholder

RUN --mount=type=cache,id=pnpm-app,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─────────────────────────────────────────
# Stage 3 — builder
# Build the Next.js application.
# ─────────────────────────────────────────
FROM base AS builder

# Restore the full node_modules tree (virtual store + per-package trees).
COPY --link --from=deps /app/ ./

# Overlay source files; .dockerignore excludes node_modules so the
# directories restored above are not overwritten.
COPY --link . .

# The Next.js middleware reads API_URL at module scope.
# A placeholder is provided so `next build` succeeds without a real API URL.
# This value ONLY exists in this stage; the runner stage sets its own
# ENV API_URL=http://localhost:2137 default (overridden at container runtime).
ARG PLACEHOLDER_API_URL=http://placeholder.invalid
ENV API_URL=${PLACEHOLDER_API_URL}

ENV DATABASE_URL=postgresql://placeholder

# Build @pluma-flags/types first — its package.json exports point to dist/index.js,
# which does not exist in the Docker context (dist/ is excluded by .dockerignore).
RUN --mount=type=cache,id=pnpm-app,target=/pnpm/store \
    pnpm --filter @pluma-flags/types build && \
    pnpm --filter @pluma-flags/app build

# ─────────────────────────────────────────
# Stage 4 — runner
# Minimal production image using Next.js standalone output.
# Standalone bundles only the required runtime deps — no node_modules copy needed.
# ─────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner

LABEL org.opencontainers.image.title="Pluma App"
LABEL org.opencontainers.image.description="Pluma feature-flag frontend (Next.js)"
LABEL org.opencontainers.image.source="https://github.com/403-html/pluma"
LABEL org.opencontainers.image.licenses="Apache-2.0"

ENV NODE_ENV=production
# API_URL is read by route handlers and middleware at request time.
# All usages are server-side only — the value is never sent to the browser.
# Override at runtime: docker run -e API_URL=https://api.example.com ...
ENV API_URL=http://localhost:2137
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextuser

WORKDIR /app

# Standalone output is a self-contained server; copy it as the working tree.
COPY --from=builder --chown=nextuser:nodejs /app/apps/app/.next/standalone ./

# Static client assets must be served from the correct path relative to the
# standalone server root.
COPY --from=builder --chown=nextuser:nodejs /app/apps/app/.next/static ./apps/app/.next/static

USER nextuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e \
        "require('http').get('http://localhost:'+process.env.PORT+'/', \
        (r) => process.exit(r.statusCode < 500 ? 0 : 1)) \
        .on('error', () => process.exit(1))"

CMD ["node", "apps/app/server.js"]
