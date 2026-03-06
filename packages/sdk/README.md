# @pluma-flags/sdk

Client SDK for evaluating feature flags from a
[Pluma](https://github.com/403-html/pluma) self-hosted feature flag server.

Fetches a flag snapshot from the Pluma API and evaluates flags locally — no
round-trip per flag check. Supports per-subject targeting via allow/deny lists
and deterministic rollout percentages.

## Install

```bash
npm install @pluma-flags/sdk
# or
pnpm add @pluma-flags/sdk
```

## Quick start

```ts
import { PlumaSnapshotCache } from "@pluma-flags/sdk";

const client = PlumaSnapshotCache.create({
  baseUrl: "http://localhost:2137",
  token: "sdk_your_token_here", // Organisation → API Keys in the Pluma UI
  ttlMs: 30_000, // optional; defaults to 30_000 ms
});

const evaluator = await client.evaluator({ subjectKey: "user-123" });

if (evaluator.isEnabled("my-feature")) {
  // flag is enabled for this subject
}
```

SDK tokens are scoped to a project and environment. Create them in the Pluma UI
under **Organisation → API Keys**.

## Framework examples

### Express.js

Create the cache once at module level and reuse it across every request.

```ts
import express from "express";
import { PlumaSnapshotCache } from "@pluma-flags/sdk";

const app = express();

// Create once — shared across all requests.
const flagCache = PlumaSnapshotCache.create({
  baseUrl: process.env.PLUMA_API_URL!,
  token: process.env.PLUMA_SDK_TOKEN!,
});

app.get("/dashboard", async (req, res) => {
  // req.user is set by your auth middleware (passport, JWT, etc.)
  const evaluator = await flagCache.evaluator({
    subjectKey: req.user?.id,
  });

  if (!evaluator.isEnabled("dashboard-v2")) {
    return res.redirect("/dashboard-legacy");
  }

  res.render("dashboard-v2");
});

app.listen(3000);
```

The `subjectKey` here is the authenticated user's ID. Users on the allow list
always get the flag; users on the deny list are always blocked; everyone else
falls through to the rollout percentage or base enabled state.

### Next.js

Use a module-level singleton in a Server Component or Route Handler. The cache
is shared across server-side renders within the same Node.js process.

```ts
// lib/flags.ts  — singleton, imported wherever flags are needed
import { PlumaSnapshotCache } from "@pluma-flags/sdk";

export const flagCache = PlumaSnapshotCache.create({
  baseUrl: process.env.PLUMA_API_URL!,
  token: process.env.PLUMA_SDK_TOKEN!,
});
```

```tsx
// app/dashboard/page.tsx  — Server Component
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { flagCache } from "@/lib/flags";

export default async function DashboardPage() {
  // Read the current user's ID from the session cookie or auth token.
  const userId = (await cookies()).get("user_id")?.value;

  const evaluator = await flagCache.evaluator({ subjectKey: userId });

  if (!evaluator.isEnabled("dashboard-v2")) {
    redirect("/dashboard-legacy");
  }

  return <main>{/* new dashboard UI */}</main>;
}
```

**Proxy/middleware pattern:** If you need to branch in Next.js `middleware.ts`
(which runs on the edge and should not call Pluma directly), evaluate the flag
in an upstream API route or Server Action and forward the result as a response
header or cookie. The middleware can then read that header to make routing
decisions without performing a flag fetch itself. Always derive `subjectKey`
from the authenticated user's session when propagating the result.

## Per-subject targeting

Pass the user's ID (or any numeric-based identifier) as `subjectKey` to
`evaluator()`. The value must match exactly what is stored in the allow/deny
lists in the Pluma UI — those lists are populated with known user IDs.
Evaluation precedence for each flag:

1. **Deny list** — if `subjectKey` is in `denyList`, returns `false`
   immediately.
2. **Allow list** — if `subjectKey` is in `allowList`, returns `true`
   immediately.
3. **Rollout percentage** — if set (not `null`), a deterministic FNV-1a 32-bit
   hash of `subjectKey:flagKey` assigns the subject to a bucket in `[0, 100)`.
   Returns `true` if the bucket falls within the percentage.
4. **Parent inheritance** — if `inheritParent` is set and the flag has a parent,
   evaluation walks up the parent chain.
5. **Base enabled state** — returns the flag's `enabled` value.

If `subjectKey` is omitted, steps 1–3 are skipped (allow/deny lists and rollout
are not evaluated). The flag resolves purely from parent inheritance and its
base enabled state.

## Caching

`PlumaSnapshotCache` uses a lazy TTL-based cache (default **30 seconds**). The
snapshot is fetched on the first `evaluator()` call and reused until the TTL
expires. There is no background polling.

- **Create the cache once** — at module level or in application startup.
  Creating a new instance per request defeats the cache entirely.
- The snapshot is **not** scoped to `subjectKey`. One cached snapshot serves all
  subjects.
- On refresh, the SDK sends the current snapshot version as an `If-None-Match`
  header. The API returns `304 Not Modified` if nothing has changed, so
  bandwidth usage is minimal.

## Parent flags

Flags can be organised into parent/child hierarchies. When a child flag has
`inheritParent: true`, evaluation walks up to the parent flag after the
allow/deny list and rollout checks on the child pass without a definitive
result. The traversal is iterative (not recursive) and bounded by
`MAX_PARENT_DEPTH` (32). A cycle guard prevents infinite loops.

## API reference

### `PlumaSnapshotCache`

| Member                      | Signature                                                    | Description                                                                      |
| --------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `PlumaSnapshotCache.create` | `(options: PlumaSnapshotCacheOptions) => PlumaSnapshotCache` | Creates a new cache instance.                                                    |
| `cache.evaluator`           | `(options?: EvaluatorOptions) => Promise<Evaluator>`         | Returns an evaluator for the current snapshot. Refreshes if the TTL has expired. |

### `PlumaSnapshotCacheOptions`

| Field     | Type     | Required | Default | Description                          |
| --------- | -------- | -------- | ------- | ------------------------------------ |
| `baseUrl` | `string` | yes      | —       | Base URL of the Pluma API server     |
| `token`   | `string` | yes      | —       | SDK token from Organisation → API Keys |
| `ttlMs`   | `number` | no       | `30000` | Snapshot cache TTL in milliseconds   |

### `EvaluatorOptions`

| Field        | Type     | Required | Description                                        |
| ------------ | -------- | -------- | -------------------------------------------------- |
| `subjectKey` | `string` | no       | User ID or numeric-based identifier matched against allow/deny lists |

### `Evaluator`

| Member      | Signature                      | Description                                    |
| ----------- | ------------------------------ | ---------------------------------------------- |
| `isEnabled` | `(flagKey: string) => boolean` | Evaluates the flag for the configured subject. |
