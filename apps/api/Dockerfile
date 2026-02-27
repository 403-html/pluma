# ─── Stage 1: build ────────────────────────────────────────────────────────────
# Installs all dependencies, builds the workspace packages, and creates a
# trimmed production deployment via `pnpm deploy`.
# Build context: repo root  (docker build -f apps/api/Dockerfile .)
FROM node:20-alpine AS build

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# ── Copy manifest files first for optimal layer-cache utilisation ──────────────
# Root manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Package manifests for the subset needed to build the API
RUN mkdir -p apps/api packages/db packages/types

COPY apps/api/package.json          ./apps/api/
COPY packages/db/package.json       ./packages/db/
COPY packages/db/prisma.config.ts   ./packages/db/
COPY packages/db/prisma/            ./packages/db/prisma/
COPY packages/db/scripts/           ./packages/db/scripts/
COPY packages/types/package.json    ./packages/types/

# Install all dependencies (postinstall runs prisma generate for @pluma/db)
RUN pnpm install --frozen-lockfile

# ── Copy the full source tree ──────────────────────────────────────────────────
COPY . .

# DATABASE_URL is required at build time so prisma generate can resolve the
# schema datasource. It is intentionally NOT baked into the image; the runtime
# API container must receive DATABASE_URL via environment variables (e.g. via
# docker-compose env_file or similar).
ARG DATABASE_URL

# Build in dependency order
RUN pnpm --filter @pluma/types build
RUN pnpm --filter @pluma/db build
RUN pnpm --filter @pluma/api build

# Create a trimmed production deployment (production node_modules only)
RUN pnpm deploy --legacy --filter @pluma/api --prod /app/api-deploy

# Carry the generated Prisma client into the deployment directory.
# `@prisma/client` runtime requires the query-engine binary that ends up in
# node_modules/.prisma — copy it explicitly in case pnpm deploy omits it.
RUN if [ -d /app/node_modules/.prisma ]; then \
      cp -r /app/node_modules/.prisma /app/api-deploy/node_modules/.prisma; \
    fi

# ─── Stage 2: runner ───────────────────────────────────────────────────────────
# Minimal production image — only compiled output and production node_modules.
FROM node:20-alpine AS runner

# Create a non-root user/group for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 apiuser

# Enable pnpm (used by the base image tooling; not required for prisma migration)
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules from the deploy stage
COPY --from=build --chown=apiuser:nodejs /app/api-deploy/node_modules ./node_modules

# Copy compiled application bundle produced by esbuild
COPY --from=build --chown=apiuser:nodejs /app/apps/api/dist ./dist

# Copy Prisma migrations, schema, and config required for prisma migrate deploy
COPY --from=build --chown=apiuser:nodejs /app/packages/db/prisma ./packages/db/prisma
COPY --from=build --chown=apiuser:nodejs /app/packages/db/prisma.config.ts ./packages/db/prisma.config.ts
COPY --from=build --chown=apiuser:nodejs /app/packages/db/package.json ./packages/db/package.json

# Copy prisma CLI from the full build node_modules for `prisma migrate deploy`.
# pnpm deploy --prod may not link the .bin entry for packages that are deps of
# workspace dependencies (rather than direct deps of @pluma/api).
# Also copy the full @prisma namespace so the CLI can resolve its own runtime
# deps (@prisma/engines, @prisma/config, etc.).
COPY --from=build --chown=apiuser:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=apiuser:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=apiuser:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

RUN apk add --no-cache curl

USER apiuser

EXPOSE 2137

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:2137/health || exit 1
# /health is registered in apps/api/src/app.ts and returns {"status":"ok"}

LABEL org.opencontainers.image.title="Pluma API"
LABEL org.opencontainers.image.description="Pluma feature-flag API server"
LABEL org.opencontainers.image.source="https://github.com/403-html/pluma"
LABEL org.opencontainers.image.licenses="Apache-2.0"

CMD ["node", "dist/index.js"]
