# ─── Stage 1: build ────────────────────────────────────────────────────────────
# Installs dependencies and produces a Next.js standalone output bundle.
# Build context: repo root  (docker build -f apps/app/Dockerfile .)
FROM node:20-alpine AS build

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# ── Copy manifest files first for optimal layer-cache utilisation ──────────────
# Root manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Package manifests for the subset needed to build the app
RUN mkdir -p apps/app packages/types

COPY apps/app/package.json       ./apps/app/
COPY packages/types/package.json ./packages/types/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ── Copy the full source tree ──────────────────────────────────────────────────
COPY . .

# NEXT_PUBLIC_API_URL is baked into the client-side bundle at build time.
# Override at build time with --build-arg NEXT_PUBLIC_API_URL=<url>.
ARG NEXT_PUBLIC_API_URL=http://api:2137
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build in dependency order
RUN pnpm --filter @pluma/types build
RUN pnpm --filter @pluma/app build

# Ensure the public directory exists for the COPY in the runner stage
RUN mkdir -p apps/app/public

# ─── Stage 2: runner ───────────────────────────────────────────────────────────
# Minimal production image using the Next.js standalone output.
FROM node:20-alpine AS runner

# Create a non-root user/group for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Copy the standalone server and its bundled node_modules
COPY --from=build --chown=nextjs:nodejs /app/apps/app/.next/standalone ./

# Copy pre-rendered static assets
COPY --from=build --chown=nextjs:nodejs /app/apps/app/.next/static ./apps/app/.next/static

# Copy public assets (may be empty, but the directory must exist)
COPY --from=build --chown=nextjs:nodejs /app/apps/app/public ./apps/app/public

USER nextjs

EXPOSE 3000

LABEL org.opencontainers.image.title="Pluma App"
LABEL org.opencontainers.image.description="Pluma feature-flag management UI"
LABEL org.opencontainers.image.source="https://github.com/403-html/pluma"
LABEL org.opencontainers.image.licenses="Apache-2.0"

# server.js is placed at the root of the standalone output directory
CMD ["node", "apps/app/server.js"]
