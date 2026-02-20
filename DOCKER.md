# Docker Development Guide

This guide explains how to use the Docker infrastructure for Pluma development and production deployments.

## Overview

Pluma provides two Docker Compose configurations:
- **docker-compose.yml** - Development mode with hot reload
- **docker-compose.prod.yml** - Production mode with optimized builds

## Prerequisites

- Docker Desktop or Docker Engine (20.10+)
- Docker Compose V2 (included with Docker Desktop)

## Development Mode

Development mode runs all services with hot reload enabled. Source code changes are immediately reflected without rebuilding containers.

### Quick Start

```bash
# Start all services (postgres, api, app)
docker compose up

# Or run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f api
docker compose logs -f app
```

### Services & Ports

- **PostgreSQL**: localhost:5432
- **API** (Fastify): localhost:3001
- **App** (Next.js): localhost:3000

### How Hot Reload Works

1. Source code is mounted as volumes into containers
2. API uses `tsx watch` to automatically restart on changes
3. App uses `next dev` for instant hot module replacement
4. No container rebuild needed when editing code

### Development Commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (fresh database)
docker compose down -v

# Rebuild a specific service
docker compose build api

# Restart a specific service
docker compose restart api

# Execute commands in running containers
docker compose exec api pnpm test
docker compose exec app pnpm lint

# Access container shell
docker compose exec api sh
docker compose exec postgres psql -U pluma -d pluma
```

## Production Mode

Production mode builds optimized, multi-stage Docker images for deployment.

### Build & Run

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start production services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Production Features

- Multi-stage builds for minimal image size
- Only production dependencies included
- Compiled/built assets (no source code in final images)
- API runs compiled `node dist/index.js`
- App runs optimized `next start`

### Production Commands

```bash
# Stop production services
docker compose -f docker-compose.prod.yml down

# Rebuild specific service
docker compose -f docker-compose.prod.yml build --no-cache api

# Scale services (example)
docker compose -f docker-compose.prod.yml up -d --scale api=3
```

## Database-Only Mode (Backward Compatibility)

The original database-only setup is still available:

```bash
cd packages/db
docker compose up -d
```

This is useful when you want to run the database in Docker but run API/App locally.

## Environment Variables

### Development
Uses defaults from `.env.example` files. Override by creating a `.env` file at repo root or in specific app directories:

```bash
# .env file example (optional for dev)
POSTGRES_USER=pluma
POSTGRES_PASSWORD=pluma
POSTGRES_DB=pluma
DATABASE_URL=postgresql://pluma:pluma@postgres:5432/pluma?schema=public
```

Individual app env files:
- `apps/api/.env` - API-specific environment variables
- `apps/app/.env` - App-specific environment variables

### Production
**Required:** You MUST provide environment variables for production. Create a `.env` file at repo root:

```bash
# .env file (REQUIRED for production)
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=pluma
DATABASE_URL=postgresql://your_db_user:your_secure_password@postgres:5432/pluma?schema=public
```

**Security Note:** Never use default credentials in production. Always set strong, unique passwords.

## Troubleshooting

### Port Conflicts
If ports 3000, 3001, or 5432 are already in use:

```bash
# Check what's using the port
lsof -i :3000

# Modify port mappings in docker-compose.yml
# Change "3000:3000" to "3002:3000" for example
```

### Permission Issues
If you encounter permission errors with volumes:

```bash
# Fix ownership (Linux/macOS)
sudo chown -R $USER:$USER .
```

### Clean Rebuild
For a completely fresh start:

```bash
# Development
docker compose down -v
docker compose build --no-cache
docker compose up

# Production  
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up
```

### Database Migrations

Run migrations in the API container:

```bash
# Development
docker compose exec api pnpm --filter @pluma/db db:migrate

# Production
docker compose -f docker-compose.prod.yml exec api pnpm --filter @pluma/db db:migrate
```

## Architecture Details

### Multi-Stage Dockerfiles

Both API and App use multi-stage builds:

1. **base** - Sets up Node.js and pnpm
2. **deps** - Installs dependencies (cached layer)
3. **dev** - Development stage with hot reload
4. **builder** - Compiles/builds the application
5. **prod** - Minimal runtime image

### Volume Mounts (Dev)

Development mode mounts:
- Source code directories (`apps/`, `packages/`)
- Workspace config (`pnpm-workspace.yaml`, `package.json`)
- Anonymous volumes for `node_modules` (prevents host override)

### Network Architecture

- Development: `pluma-dev` network
- Production: `pluma-prod` network
- All services can communicate using service names (e.g., `postgres`, `api`)

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Build production images
  run: docker compose -f docker-compose.prod.yml build

- name: Run tests
  run: |
    docker compose up -d postgres
    docker compose exec -T api pnpm test
```

## Best Practices

1. **Use development mode for coding** - Fastest feedback loop
2. **Test production builds locally** - Catch build issues early
3. **Don't commit .env files** - Use .env.example as templates
4. **Use specific tags for production** - Don't rely on `latest`
5. **Monitor logs** - Use `docker compose logs -f` to watch for issues

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
