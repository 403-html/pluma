# syntax=docker/dockerfile:1

# Base stage - setup pnpm
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Dependencies stage - install all dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace configuration and package manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/app/package.json ./apps/app/
COPY packages/db/package.json ./packages/db/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/types/package.json ./packages/types/

# Copy tooling for build scripts
COPY tooling ./tooling

# Install dependencies with frozen lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Development stage - for hot reload
FROM base AS dev
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./
COPY tooling ./tooling

# Copy source code (will be mounted as volume for hot reload)
COPY apps/api ./apps/api
COPY packages ./packages

# Set environment
ENV NODE_ENV=development
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

# Use tsx watch for hot reload
CMD ["pnpm", "--filter", "@pluma/api", "dev"]

# Builder stage - compile TypeScript
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./
COPY tooling ./tooling

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Build the application
RUN pnpm --filter @pluma/api build

# Production runner stage
FROM base AS runner
WORKDIR /app

# Copy workspace configuration and manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

# Install production dependencies only.
# prisma is now a production dependency of @pluma/db so it is included here,
# making `prisma migrate deploy` available at container startup.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema and migrations for runtime
COPY packages/db/prisma ./packages/db/prisma

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser && \
    chown -R apiuser:nodejs /app

USER apiuser

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Run migrations and start server
# NOTE: In production orchestration (K8s, Swarm), consider running migrations
# as a separate init container/job for better control over failure handling
CMD sh -c "pnpm --filter @pluma/db db:migrate:deploy && node apps/api/dist/index.js"
