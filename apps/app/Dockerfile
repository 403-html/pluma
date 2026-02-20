# syntax=docker/dockerfile:1

# Base stage - shared dependencies
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Dependencies stage - fetch and install dependencies
FROM base AS deps

# Copy all package.json files
COPY apps/app/package.json ./apps/app/
COPY packages/types/package.json ./packages/types/
COPY tooling/eslint/package.json ./tooling/eslint/

# Fetch dependencies
RUN pnpm fetch

# Install dependencies
COPY apps/app/package.json ./apps/app/
COPY packages/types/package.json ./packages/types/
COPY tooling/eslint/package.json ./tooling/eslint/

RUN pnpm install --frozen-lockfile --offline

# Development stage - hot reload with next dev
FROM base AS dev

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/tooling/eslint/node_modules ./tooling/eslint/node_modules

# Note: Source code will be mounted as volumes in docker-compose.yml
# This allows hot reload without rebuilding the image

WORKDIR /app/apps/app

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

# Hot reload with next dev
CMD ["pnpm", "dev"]

# Builder stage - build Next.js application
FROM base AS builder

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/tooling/eslint/node_modules ./tooling/eslint/node_modules

# Copy source code
COPY . .

# Build the Next.js app
WORKDIR /app/apps/app
RUN pnpm build

# Production stage - minimal runtime image
FROM node:22-alpine AS prod

# Install pnpm (needed for workspace resolution)
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy necessary package files for production
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/app/package.json ./apps/app/
COPY --from=builder /app/packages/types/package.json ./packages/types/

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=builder /app/packages/types/node_modules ./packages/types/node_modules

# Copy Next.js build output and necessary files
COPY --from=builder /app/apps/app/.next ./apps/app/.next
COPY --from=builder /app/apps/app/next.config.ts ./apps/app/next.config.ts
COPY --from=builder /app/apps/app/next-env.d.ts ./apps/app/next-env.d.ts
COPY --from=builder /app/apps/app/public ./apps/app/public

# Copy shared packages source (needed for workspace imports)
COPY --from=builder /app/packages/types ./packages/types

WORKDIR /app/apps/app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Use next start for production
CMD ["pnpm", "start"]
