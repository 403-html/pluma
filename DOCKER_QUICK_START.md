# Docker Quick Start Guide

Quick reference for working with Pluma's Docker setup.

## 🚀 Development (Hot-reload)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start all services (PostgreSQL, API, Next.js)
docker compose up -d

# 3. Watch logs
docker compose logs -f

# 4. Stop services
docker compose down
```

**Hot-reload is enabled:**
- Edit files in `apps/api/src` → API reloads automatically
- Edit files in `apps/app/src` → Next.js rebuilds automatically
- Edit files in `packages/*` → Both reload automatically

## 🏭 Production

```bash
# 1. Set required environment variables
export POSTGRES_USER=production_user
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# 2. Start production services
docker compose -f docker-compose.prod.yml up -d

# 3. View logs
docker compose -f docker-compose.prod.yml logs -f

# 4. Stop services
docker compose -f docker-compose.prod.yml down
```

## 🔧 Common Tasks

### Rebuild after Dockerfile changes
```bash
docker compose up -d --build
```

### Restart a single service
```bash
docker compose restart api
docker compose restart app
```

### View service logs
```bash
docker compose logs -f api
docker compose logs -f app
docker compose logs -f postgres
```

### Execute commands in containers
```bash
# Access API container shell
docker compose exec api sh

# Access Next.js container shell
docker compose exec app sh

# Access PostgreSQL shell
docker compose exec postgres psql -U pluma -d pluma
```

### Run database migrations
```bash
docker compose exec api pnpm --filter @pluma/db db:migrate:deploy
```

### Clean everything (including volumes)
```bash
docker compose down -v
```

## 📊 Service URLs

| Service | Development | Production |
|---------|-------------|------------|
| Next.js | http://localhost:3000 | http://localhost:3000 |
| API | http://localhost:4000 | http://localhost:4000 |
| PostgreSQL | localhost:5432 | localhost:5432 |

## 🐛 Troubleshooting

### Port already in use
```bash
# Find process using port 3000, 4000, or 5432
lsof -i :3000
lsof -i :4000
lsof -i :5432

# Stop the conflicting process or change ports in docker-compose.yml
```

### Container won't start
```bash
# Check logs
docker compose logs api
docker compose logs app

# Rebuild from scratch
docker compose down -v
docker compose up -d --build
```

### Hot-reload not working
```bash
# Restart the service
docker compose restart api
# or
docker compose restart app
```

### Database connection issues
```bash
# Check if PostgreSQL is healthy
docker compose ps

# View database logs
docker compose logs postgres

# Verify DATABASE_URL in .env matches compose config
```

## 📝 Environment Variables

### Development (.env)
```bash
POSTGRES_USER=pluma
POSTGRES_PASSWORD=pluma
POSTGRES_DB=pluma
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Production (.env)
```bash
POSTGRES_USER=production_user
POSTGRES_PASSWORD=<generated-secure-password>
POSTGRES_DB=pluma_production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🔒 Security Notes

- **Development:** Uses default credentials for convenience
- **Production:** Requires strong credentials (no defaults)
- **Never commit** `.env` files with real credentials
- Use `.env.example` as template only

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js App (Port 3000)                   │
│  • Frontend UI                              │
│  • Hot-reload enabled in dev                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Fastify API (Port 4000)                   │
│  • REST API endpoints                       │
│  • Hot-reload enabled in dev                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL (Port 5432)                     │
│  • Persistent data storage                  │
│  • Health checks enabled                    │
└─────────────────────────────────────────────┘
```

## 📚 Related Documentation

- Full validation report: `DOCKER_VALIDATION_REPORT.md`
- Main README: `README.md`
- API docs: `apps/api/README.md`
- App docs: `apps/app/README.md`
