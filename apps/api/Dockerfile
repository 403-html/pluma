# syntax=docker/dockerfile:1
# apps/api/Dockerfile
#
# Multi-stage build for the Pluma API (Fastify).
# Build context MUST be the monorepo root:
#
#   docker build -f apps/api/Dockerfile -t pluma-api .
#
# Recommended: use Docker Compose so the API and database share a
# network and DATABASE_URL can reference the postgres service by name:
#
#   docker compose up --build
#
# Standalone docker run: `localhost` resolves to the container itself,
# not the host machine. Use the appropriate host for your platform:
#
#   # macOS / Windows — Docker Desktop provides host.docker.internal:
#   docker run -e DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/db \
#              -p 2137:2137 pluma-api
#
#   # Linux — use --network=host so localhost works as expected.
#   # Port mapping (-p) is ignored with --network=host; the port is
#   # exposed directly on the host interface:
#   docker run --network=host \
#              -e DATABASE_URL=postgresql://user:pass@localhost:5432/db \
#              pluma-api

# Stage 1 — base
FROM node:22-alpine AS base

# Resolve pnpm from the `packageManager` field in the root package.json.
RUN corepack enable

WORKDIR /app

# Stage 2 — deps
# Install the full workspace dependency tree.
FROM base AS deps

# Copy workspace manifests — pnpm needs every package.json to resolve the lockfile.
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

COPY --link apps/api/package.json         ./apps/api/
COPY --link apps/app/package.json         ./apps/app/
COPY --link apps/storybook/package.json   ./apps/storybook/
COPY --link packages/db/package.json      ./packages/db/
COPY --link packages/sdk/package.json     ./packages/sdk/
COPY --link packages/types/package.json   ./packages/types/
COPY --link tooling/eslint/package.json   ./tooling/eslint/

# @pluma/db postinstall runs `prisma generate`; copy the schema and script so it
# succeeds even without a real DATABASE_URL.
COPY --link packages/db/scripts/             ./packages/db/scripts/
COPY --link packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

ENV DATABASE_URL=postgresql://placeholder

RUN pnpm install --frozen-lockfile

# Stage 3 — builder
# Build all workspace packages and create the pruned deployment directory.
FROM base AS builder

COPY --from=deps /app ./

# Overlay source files; .dockerignore excludes node_modules so the directories
# restored above are not overwritten.
COPY --link . .

ENV DATABASE_URL=postgresql://placeholder

RUN pnpm --filter @pluma/types build
RUN pnpm --filter @pluma/db db:generate
RUN pnpm --filter @pluma/db build
RUN pnpm --filter @pluma/api build

# Produce the pruned production deployment directory (prod deps only).
# --legacy is required in pnpm v10+ for workspaces without inject-workspace-packages=true.
RUN pnpm --filter @pluma/api deploy --prod --legacy /app/deploy

# Copy Prisma schema, migrations, and config so the entrypoint can run `prisma migrate deploy`.
# prisma.config.ts is required by Prisma 7 to resolve DATABASE_URL at runtime.
RUN cp -r packages/db/prisma /app/deploy/prisma && \
    cp packages/db/prisma.config.ts /app/deploy/prisma.config.ts

# Copy the pre-generated Prisma client into the deployment directory.
# pnpm's virtual-store layout places the generated client inside the store entry
# for @prisma/client; follow the symlink and navigate up two levels to find .prisma/.
RUN src=$(readlink -f packages/db/node_modules/@prisma/client) && \
    prisma_dir="$(dirname "$(dirname "$src")")/.prisma" && \
    [ -d "$prisma_dir" ] || { echo "ERROR: $prisma_dir not found — was prisma generate run?"; exit 1; } && \
    cp -r "$prisma_dir" /app/deploy/node_modules/.prisma

# Stage 4 — runner
# Minimal production image.
FROM node:22-alpine AS runner

LABEL org.opencontainers.image.title="Pluma API"
LABEL org.opencontainers.image.description="Pluma feature flag API server"
LABEL org.opencontainers.image.source="https://github.com/403-html/pluma"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=2137
ENV HOST=0.0.0.0

COPY --from=builder --chown=node:node /app/deploy ./

# pnpm deploy --prod follows .gitignore which excludes dist/; copy the
# compiled API output explicitly so the entrypoint can run node dist/index.js.
COPY --from=builder --chown=node:node /app/apps/api/dist ./dist

COPY --link --chown=node:node apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e \
        "require('http').get('http://localhost:'+process.env.PORT+'/health', \
        (r) => process.exit(r.statusCode === 200 ? 0 : 1)) \
        .on('error', () => process.exit(1))"

CMD ["./docker-entrypoint.sh"]
