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
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY tooling/eslint/package.json ./tooling/eslint/

# Fetch dependencies
RUN pnpm fetch

# Install dependencies
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY tooling/eslint/package.json ./tooling/eslint/

RUN pnpm install --frozen-lockfile --offline

# Development stage - hot reload with tsx watch
FROM base AS dev

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/tooling/eslint/node_modules ./tooling/eslint/node_modules

# Note: Source code will be mounted as volumes in docker-compose.yml
# This allows hot reload without rebuilding the image

WORKDIR /app/apps/api

ENV NODE_ENV=development
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# Hot reload with tsx watch
CMD ["pnpm", "dev"]

# Builder stage - compile TypeScript and build with esbuild
FROM base AS builder

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/tooling/eslint/node_modules ./tooling/eslint/node_modules

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app/packages/db
RUN pnpm db:generate

# Build the API
WORKDIR /app/apps/api
RUN pnpm build

# Production stage - minimal runtime image
FROM node:22-alpine AS prod

# Install pnpm (needed for workspace resolution)
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy necessary package files for production
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/types/package.json ./packages/types/

# Copy node_modules (production dependencies only would be better, but workspace makes it complex)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/types/node_modules ./packages/types/node_modules

# Copy Prisma generated client
COPY --from=builder /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy shared packages source (needed for workspace imports)
COPY --from=builder /app/packages/types ./packages/types

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# Use node to run the compiled output
CMD ["node", "dist/index.js"]
