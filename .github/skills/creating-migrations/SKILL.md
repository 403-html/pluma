---
name: creating-migrations
description: Mandatory workflow for creating database migrations in Pluma using Prisma 7 + PostgreSQL
---

This skill documents the mandatory workflow for creating database migrations in Pluma. All schema changes MUST follow this process to ensure deterministic, auditable, and team-safe migrations.

## Rationale: Why Scripts Are Mandatory

Prisma CLI generates:
1. **Exact timestamp-prefixed directory names** (e.g., `20260222215035_add_user_table`) that enforce chronological ordering across the team.
2. **Precise SQL diff** derived from your schema.prisma changes — not hand-written, error-prone SQL.

Both are required for:
- **Determinism**: Every developer and CI environment applies the same SQL in the same order.
- **Auditability**: Git history shows exactly what schema change was made, when, and by whom.
- **Safety**: Prisma detects destructive changes and prompts for confirmation; hand-written SQL bypasses this.

## Mandatory Workflow

### Step 1: Edit the Schema
Edit `packages/db/prisma/schema.prisma` to define your data model changes.

### Step 2: Generate Prisma Client
```bash
pnpm --filter @pluma/db db:generate
```
This regenerates the Prisma Client to match your schema changes.

### Step 3: Create the Migration
```bash
pnpm --filter @pluma/db db:migrate --name <descriptive_name>
```

**Naming Convention**:
- Use `lowercase_snake_case`
- Be descriptive and specific
- Examples:
  - ✅ `add_sdk_token_expires_at`
  - ✅ `drop_legacy_sessions`
  - ✅ `add_index_on_flag_environment_id`
  - ❌ `update` (too generic)
  - ❌ `change` (too vague)
  - ❌ `fix` (not descriptive)

This command will:
1. Generate a timestamped directory: `packages/db/prisma/migrations/YYYYMMDDHHMMSS_<descriptive_name>/`
2. Create `migration.sql` containing the exact SQL diff
3. Apply the migration to your local database

### Step 4: Review the Generated SQL
**Always inspect** `packages/db/prisma/migrations/<timestamp>_<name>/migration.sql` before committing:
- Verify the SQL matches your intent
- Check for destructive operations (DROP, ALTER with data loss)
- Ensure indexes and constraints are correct

### Step 5: Commit Schema + Migration Together
Commit both files in the same commit:
```bash
git add packages/db/prisma/schema.prisma
git add packages/db/prisma/migrations/<timestamp>_<name>/
git commit -m "feat(db): <your change description>"
```

## Full Lifecycle Example
```bash
# 1. Edit schema
vim packages/db/prisma/schema.prisma

# 2. Generate client
pnpm --filter @pluma/db db:generate

# 3. Create migration
pnpm --filter @pluma/db db:migrate --name add_user_avatar_url

# 4. Review generated SQL
cat packages/db/prisma/migrations/20260222215035_add_user_avatar_url/migration.sql

# 5. Commit both
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add avatar_url to User model"
```

## Verification Checklist
Before committing, verify:
- [ ] `schema.prisma` contains your intended changes
- [ ] Migration directory has a timestamp prefix
- [ ] `migration.sql` reflects the schema diff accurately
- [ ] No manual edits to generated SQL (if needed, edit schema and regenerate)
- [ ] Migration applies cleanly to your local database
- [ ] Both schema and migration files are staged for commit

## Prohibited Actions
**DO NOT**:
- ❌ Write SQL directly into `migrations/` — always use `pnpm db:migrate`
- ❌ Use `pnpm db:push` for production or shared-dev changes (it skips migration files and is only for rapid local prototyping)
- ❌ Manually edit generated `migration.sql` files — if the SQL is wrong, fix the schema and regenerate
- ❌ Use generic migration names like "update", "change", "fix", "schema"
- ❌ Commit schema changes without a corresponding migration
- ❌ Commit migrations without the schema changes that generated them

## When to Invoke This Skill
Backend agents MUST invoke this skill whenever:
- A data model change is needed
- Adding/removing tables or columns
- Modifying indexes or constraints
- Any change to `schema.prisma` that affects the database structure

## Additional Commands Reference
- `pnpm --filter @pluma/db db:studio` — Open Prisma Studio to inspect your database
- `pnpm --filter @pluma/db db:migrate:deploy` — Apply pending migrations (CI/production)
- `pnpm --filter @pluma/db db:seed` — Run seed script
