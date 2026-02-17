# @pluma/db

Database package with Prisma ORM and PostgreSQL.

## Quick Start

### 1. Start PostgreSQL (Docker)

```bash
docker-compose up -d
```

This starts a local PostgreSQL instance on port 5432.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

The default `DATABASE_URL` in `.env` works with the Docker setup.

### 4. Generate Prisma Client

```bash
pnpm db:generate
```

**When to use:** After installing, changing schema, or pulling schema changes.

### 5. Apply Schema to Database

```bash
pnpm db:migrate
```

Creates migration files and applies them to the database. Use this for tracking schema history.

**For Quick Development (No Migration Files):**

```bash
pnpm db:push
```

Pushes schema changes directly to the database without creating migration files.

### 6. (Optional) Seed Database

```bash
pnpm db:seed
```

Populates the database with initial data defined in `prisma/seed.ts`.

## Workflows

### I want to: Make schema changes in development

1. Edit `prisma/schema.prisma`
2. Run `pnpm db:generate` (regenerates Prisma Client types)
3. Run `pnpm db:migrate` (creates migration + applies to database)
4. Test your changes

**Quick alternative without migrations:**

1. Edit `prisma/schema.prisma`
2. Run `pnpm db:push` (applies changes directly)
3. Run `pnpm db:generate` if types need updating

### I want to: Create a production migration

1. Edit `prisma/schema.prisma`
2. Run `pnpm db:migrate --name descriptive_name` (creates migration file + applies it)
3. Commit the migration file in `prisma/migrations/`
4. In production, run `pnpm db:migrate:deploy`

### I want to: Explore the database visually

```bash
pnpm db:studio
```

Opens Prisma Studio in your browser at http://localhost:5555

### I want to: Reset the database

```bash
docker-compose down -v  # Destroys database
docker-compose up -d    # Recreates database
pnpm db:push            # Reapply schema
pnpm db:seed            # (Optional) Reseed data
```

## Usage in Code

```typescript
import { prisma } from '@pluma/db';

// Query projects
const projects = await prisma.project.findMany();

// Create a project
const project = await prisma.project.create({
  data: {
    key: 'my-project',
    name: 'My Project',
  },
});
```

## Docker Setup

The included `docker-compose.yml` provides:

- PostgreSQL 16 on port 5432
- Database: `pluma`
- User: `pluma`
- Password: `pluma`
- Persistent volume: `pluma_postgres_data`

To stop the database:

```bash
docker-compose down
```

To destroy the database and volumes:

```bash
docker-compose down -v
```

## Schema

Edit `prisma/schema.prisma` to define your database models. Prisma 7 uses a `prisma.config.ts` file for database connection configuration, keeping the schema file clean and focused on your data models.
