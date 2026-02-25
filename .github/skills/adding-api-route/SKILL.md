---
name: adding-api-route
description: Deterministic golden path for adding a new Admin API route to the Pluma Fastify server — schema, auth, Prisma, audit, registration, and tests
---

This skill encodes the exact, repeatable pattern for adding a new Admin API endpoint. Follow every step; skipping any step produces a route that is inconsistent with the rest of the codebase.

## Route Anatomy

Every Admin API route in Pluma consists of:

| Layer | File | Purpose |
|---|---|---|
| Schema (Zod) | `apps/api/src/routes/admin/<resource>.ts` | Request validation |
| Route handler | same file | Business logic, Prisma calls, audit |
| Route registration | same file (exported fn) | Wires handler into Fastify |
| App registration | `apps/api/src/app.ts` | Mounts the exported fn under `/api/v1` |
| Tests | `apps/api/src/tests/<resource>.test.ts` | Unit tests with Prisma mock |

## Step 1: Create the Route File

Create `apps/api/src/routes/admin/<resource>.ts`. Use this exact skeleton:

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { prisma } from '@pluma/db';
import { adminAuthHook } from '../../hooks/adminAuth';
import { writeAuditLog } from '../../lib/audit';

const resourceParamsSchema = z.object({
  resourceId: z.uuid(),
});

const resourceBodySchema = z.object({
  name: z.string().min(1).max(200),
  // add fields here
});

const resourceUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
  })
  .refine(
    (body) => body.name !== undefined,
    { message: 'At least one field is required' },
  );

export async function registerResourceRoutes(fastify: FastifyInstance) {
  fastify.get('/resources', { preHandler: [adminAuthHook] }, async (request, reply) => {
    // validate, query, return
  });

  fastify.post('/resources', { preHandler: [adminAuthHook] }, async (request, reply) => {
    // validate, transact, audit, return 201
  });

  fastify.patch('/resources/:resourceId', { preHandler: [adminAuthHook] }, async (request, reply) => {
    // validate, transact, audit, return 200
  });

  fastify.delete('/resources/:resourceId', { preHandler: [adminAuthHook] }, async (request, reply) => {
    // validate, transact, audit, return 204
  });
}
```

## Step 2: Validation Pattern

Always use `safeParse` (not `parse`). Never throw on validation failure — use `reply` helpers:

```typescript
const parsedParams = resourceParamsSchema.safeParse(request.params);
const parsedBody = resourceBodySchema.safeParse(request.body);

if (!parsedParams.success) {
  request.log.warn({ params: request.params }, 'POST /resources rejected: invalid params');
  return reply.badRequest(ReasonPhrases.BAD_REQUEST);
}

if (!parsedBody.success) {
  request.log.warn({ issues: parsedBody.error.flatten() }, 'POST /resources rejected: invalid payload');
  return reply.badRequest(ReasonPhrases.BAD_REQUEST);
}
```

**Log format**: always `request.log.warn({ context_object }, 'METHOD /path rejected: reason')`.

## Step 3: Database Access Pattern

**Reads**: use `prisma.<model>.findUnique` or `findMany` directly.

**Mutations that affect `configVersion`**: wrap in `prisma.$transaction`. Always increment `configVersion` on the environment(s) belonging to the changed project:

```typescript
const resource = await prisma.$transaction(async (tx) => {
  const created = await tx.resource.create({ data: parsedBody.data });

  // Bump configVersion on all environments in the project so SDK clients know to re-fetch
  await tx.environment.updateMany({
    where: { projectId: created.projectId },
    data: { configVersion: { increment: 1 } },
  });

  return created;
});
```

**Not-found checks**: look up parent/related resources before mutating and return `reply.notFound` immediately if missing.

## Step 4: Audit Logging

Call `writeAuditLog` after every successful create/update/delete. Wrap in its own try/catch so an audit failure never breaks the response:

```typescript
try {
  await writeAuditLog({
    action: 'create',          // 'create' | 'update' | 'delete' | 'enable' | 'disable'
    entityType: 'flag',        // see AuditEntityType in @pluma/types
    entityId: resource.id,
    entityKey: resource.key,
    projectId: resource.projectId,
    actorId: request.sessionUserId!,
    actorEmail: request.sessionUser!.email,
  });
} catch (auditError) {
  request.log.error({ err: auditError, resourceId: resource.id }, 'POST /resources: failed to write audit log');
}
```

Import: `import { writeAuditLog } from '../../lib/audit';`

## Step 5: Prisma Error Handling

Map Prisma error codes to HTTP responses:

| Prisma code | Meaning | HTTP response |
|---|---|---|
| `P2002` | Unique constraint violation | `reply.conflict(ReasonPhrases.CONFLICT)` |
| `P2025` | Record not found (on update/delete) | `reply.notFound(ReasonPhrases.NOT_FOUND)` |

```typescript
} catch (error) {
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
    return reply.conflict(ReasonPhrases.CONFLICT);
  }
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2025') {
    return reply.notFound(ReasonPhrases.NOT_FOUND);
  }
  throw error;
}
```

## Step 6: HTTP Status Codes

Always use `StatusCodes` and `ReasonPhrases` from `http-status-codes`. Never use bare numbers.

| Operation | Success code |
|---|---|
| GET (list / single) | `200 OK` (default — no explicit `reply.code()` needed) |
| POST (create) | `reply.code(StatusCodes.CREATED).send(resource)` |
| PATCH (update) | `200 OK` — return the updated resource directly |
| DELETE | `reply.code(StatusCodes.NO_CONTENT).send()` |

## Step 7: Register in app.ts

Add the import and register call in `apps/api/src/app.ts` inside the `adminApi` block:

```typescript
import { registerResourceRoutes } from './routes/admin/<resource>';

// Inside the adminApi register callback:
await registerResourceRoutes(adminApi);
```

## Step 8: Write the Test File

Create `apps/api/src/tests/<resource>.test.ts`. Use this exact structure:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  PROJECT_ID, AUTH_COOKIE, mockSession, mockProject,
  // import other fixtures as needed
} from './fixtures';

// MUST use vi.hoisted — plain vi.mock doesn't hoist correctly with tsx
const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    project:     { findUnique: vi.fn() },
    session:     { findUnique: vi.fn() },
    user:        { findUnique: vi.fn(), count: vi.fn() },
    resource:    { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    environment: { updateMany: vi.fn() },
    auditLog:    { create: vi.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn() as any,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) => fn(prismaMock));
  return { prismaMock };
});

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));

describe('<Resource> routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore session mock so auth passes by default in every test
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
  });

  describe('GET /api/v1/resources', () => {
    it('should list resources', async () => {
      prismaMock.resource.findMany.mockResolvedValue([]);
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/resources',
        headers: { cookie: AUTH_COOKIE },
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/resources', () => {
    it('should create a resource', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.resource.create.mockResolvedValue({ id: 'new-id', name: 'Test' });
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { name: 'Test' },
        headers: { cookie: AUTH_COOKIE },
      });
      expect(response.statusCode).toBe(201);
    });

    it('should return 409 on unique constraint violation', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.resource.create.mockRejectedValue({ code: 'P2002' });
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { name: 'Duplicate' },
        headers: { cookie: AUTH_COOKIE },
      });
      expect(response.statusCode).toBe(409);
    });
  });
});
```

**Key rules for tests:**
- `vi.hoisted` is REQUIRED for the Prisma mock — plain `vi.mock` at module level doesn't work with the tsx module system
- `prismaMock.$transaction` MUST be wired to call the callback with `prismaMock` (see above)
- `prismaMock.session.findUnique.mockResolvedValue(mockSession)` in `beforeEach` — required so auth passes by default
- `vi.clearAllMocks()` in `beforeEach` — prevents state leakage between tests
- Use `app.inject` for all requests — no real HTTP server or database needed in unit tests
- Import all fixtures from `./fixtures` — never hard-code UUIDs inline

## Step 9: Preflight Checks

Before handing off, run the `pre-review-checklist` skill. Minimum for API-only changes:

```bash
pnpm --filter @pluma/api lint
pnpm --filter @pluma/api build
pnpm --filter @pluma/api test
```

All three must exit with code `0`.

## Common Failure Signatures

| Symptom | Root cause | Fix |
|---|---|---|
| `prismaMock.$transaction is not a function` | `vi.hoisted` not used | Wrap mock in `vi.hoisted(() => { ... })` |
| Auth returns 401 on every test | `session.findUnique` not mocked | Add `prismaMock.session.findUnique.mockResolvedValue(mockSession)` to `beforeEach` |
| `Cannot find module '@pluma/db'` | `vi.mock` not at top level | Move `vi.mock` outside `describe` |
| Route returns 404 on every call | Route not registered in `app.ts` | Add `await registerResourceRoutes(adminApi)` |
| Audit log error throws 500 | `writeAuditLog` not wrapped in try/catch | Wrap audit call — audit failure must never break the response |
| TypeScript error on `request.sessionUserId` | Missing `adminAuthHook` in `preHandler` | Add `{ preHandler: [adminAuthHook] }` to the route |

## When to Invoke This Skill

Invoke this skill when:
- Adding any new Admin API route (`/api/v1/*`)
- Adding CRUD operations for a new resource type
- Extending an existing route file with new endpoints
