# Troubleshooting

Common issues and solutions when running Pluma.

## Docker Issues

### Containers won't start
Ensure Docker Desktop is running and has sufficient resources allocated.

### Port already in use
Stop conflicting services or change port mappings in `docker-compose.yml`.

### Hot reload not working
- **Windows**: Ensure WSL2 backend is enabled in Docker Desktop settings.
- **macOS**: File watching should work natively.
- **Linux**: File watching should work natively.

### Database connection errors in container
Wait for postgres health check to pass. Check container status with:
```bash
docker compose ps
```

### Build cache issues
Clear Docker build cache with:
```bash
docker compose build --no-cache
```

## Local Development Issues

### Database connection errors
Verify Docker is running and PostgreSQL container is healthy:
```bash
cd packages/db && docker-compose ps
```

### Prisma type/client drift
Run Prisma client generation after pulling schema changes:
```bash
pnpm --filter @pluma/db db:generate
```

### Port already in use
Update `apps/api/.env` `PORT` value and restart dev servers.

### Workspace import issues
Rerun `pnpm install` at root to refresh workspace links:
```bash
pnpm install
```

## Switching Between Docker and Local

If switching from Docker to local development or vice versa:

1. Stop all containers:
   ```bash
   docker compose down
   ```

2. Clear any local dev servers (Ctrl+C)

3. Ensure correct `DATABASE_URL` in `.env` files:
   - **Docker**: `postgresql://pluma:pluma@postgres:5432/pluma` (uses service name)
   - **Local**: `postgresql://pluma:pluma@localhost:5432/pluma` (uses localhost)
   
   **Note**: These examples use default development credentials. In production, use strong, unique passwords (see [Security](security.md)).

4. Restart your chosen development mode
