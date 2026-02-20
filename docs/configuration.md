# Configuration

This document describes environment variables and configuration options for Pluma services.

## Docker Compose (Default)

When using Docker Compose, environment variables are pre-configured in the compose files:
- API runs on port **4000**
- UI runs on port **3000**
- Database connection is automatically configured

### Note on NEXT_PUBLIC_API_URL

- In development, `http://localhost:4000` works because the browser (running on your host machine) makes requests to the API exposed at localhost:4000.
- In production deployments, override `NEXT_PUBLIC_API_URL` with your actual API domain (e.g., `https://api.yourdomain.com`) before building, as this value is **embedded at build time**.

## Local Development

If running services locally (without Docker Compose):
- Keep environment files local; do not commit `.env` files.
- Templates:
  - `apps/api/.env.example` (PORT is now 4000 to avoid conflicts)
  - `apps/app/.env.example` (NEXT_PUBLIC_API_URL points to localhost:4000)
  - `packages/db/.env.example`
- `apps/api` and `packages/db` both use `DATABASE_URL` for PostgreSQL connection.

## Port Configuration

- **API default**: `4000` (changed from 3000 to avoid conflict with Next.js)
- **UI default**: `3000`
- **PostgreSQL**: `5432`

## DATABASE_URL Format

The `DATABASE_URL` environment variable uses the PostgreSQL connection string format:

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### Docker vs Local

- **Docker**: `postgresql://pluma:pluma@postgres:5432/pluma` (uses service name)
- **Local**: `postgresql://pluma:pluma@localhost:5432/pluma` (uses localhost)

**Note**: These examples use default development credentials. In production, use strong, unique passwords (see [Security](security.md)).

### Security Note

`DATABASE_URL` embeds credentials as plaintext in the connection string environment variable. For enhanced security in production:
- Use Docker secrets (see [Security](security.md)) instead of environment variables
- Or inject credentials at runtime from a secrets manager
- Avoid logging `DATABASE_URL` or exposing it via container inspection
