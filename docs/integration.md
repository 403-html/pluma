# SDK Integration

The `@pluma/sdk` package lets any Node.js (or edge-runtime) application evaluate feature flags against a running Pluma server.

## Install

```bash
npm install @pluma/sdk
# or
pnpm add @pluma/sdk
# or
yarn add @pluma/sdk
```

## Prerequisites

You need:

1. A running Pluma server — see [Getting Started](getting-started.md).
2. An **SDK token** scoped to the project and environment you want to evaluate.

### Creating an SDK token

1. Open the Pluma UI at `http://localhost:3000`.
2. Navigate to your project → **Tokens**.
3. Click **Create token**, give it a name, and copy the generated value.

Keep the token secret; it grants read-only access to your flag snapshot.

## Quick Start

```ts
import { PlumaSnapshotCache } from '@pluma/sdk';

const cache = PlumaSnapshotCache.create({
  baseUrl: 'http://localhost:4000',  // your Pluma API URL
  token: 'pluma_sdk_xxxxxxxxxxxx',   // SDK token from the UI
});

const evaluator = await cache.evaluator();

if (evaluator.isEnabled('dark-mode')) {
  // render dark theme
}
```

## Concepts

### Snapshot cache

`PlumaSnapshotCache` fetches the flag snapshot once and reuses it until the TTL expires. Refresh is **lazy** — it happens on the next `evaluator()` call after the TTL, not in the background. This keeps your application simple and avoids hidden polling overhead.

```ts
const cache = PlumaSnapshotCache.create({
  baseUrl: 'https://pluma.example.com',
  token: process.env.PLUMA_SDK_TOKEN!,
  ttlMs: 60_000, // refresh at most once per minute (default: 30 000 ms)
});
```

### Evaluator

`cache.evaluator()` returns a lightweight object valid for the current snapshot. Call it once per request and reuse the result for the lifetime of that request.

```ts
const evaluator = await cache.evaluator();

const isDarkMode    = evaluator.isEnabled('dark-mode');
const isNewCheckout = evaluator.isEnabled('new-checkout');
```

### Subject targeting

Pass a `subjectKey` to apply per-subject allow/deny lists configured in the Pluma UI.

```ts
const evaluator = await cache.evaluator({ subjectKey: user.id });

if (evaluator.isEnabled('beta-feature')) {
  // enabled for this specific user
}
```

Evaluation precedence (highest to lowest):

1. **Deny list** — subject is explicitly blocked → `false`
2. **Allow list** — subject is explicitly granted → `true`
3. **Parent inheritance** — flag delegates to its parent flag (if `inheritParent` is set)
4. **Base enabled state** — the flag's global on/off value

If no `subjectKey` is provided, steps 1 and 2 are skipped and evaluation falls through to parent inheritance and the base state.

## Framework examples

### Next.js (App Router, Server Component)

Create the cache once at module scope so it is shared across requests:

```ts
// lib/flags.ts
import { PlumaSnapshotCache } from '@pluma/sdk';

export const flagCache = PlumaSnapshotCache.create({
  baseUrl: process.env.PLUMA_API_URL!,
  token: process.env.PLUMA_SDK_TOKEN!,
  ttlMs: 30_000,
});
```

Use it in a Server Component:

```tsx
// app/page.tsx
import { flagCache } from '@/lib/flags';

export default async function Page() {
  const flags = await flagCache.evaluator();

  return flags.isEnabled('new-hero') ? <NewHero /> : <CurrentHero />;
}
```

### Express

```ts
import express from 'express';
import { PlumaSnapshotCache } from '@pluma/sdk';

const flagCache = PlumaSnapshotCache.create({
  baseUrl: process.env.PLUMA_API_URL!,
  token: process.env.PLUMA_SDK_TOKEN!,
});

const app = express();

app.get('/checkout', async (req, res) => {
  const userId = req.params.userId; // replace with your auth middleware's user ID
  const flags = await flagCache.evaluator({ subjectKey: userId });

  if (flags.isEnabled('new-checkout')) {
    return res.redirect('/checkout/v2');
  }
  res.render('checkout');
});
```

### Fastify

```ts
import Fastify from 'fastify';
import { PlumaSnapshotCache } from '@pluma/sdk';

const flagCache = PlumaSnapshotCache.create({
  baseUrl: process.env.PLUMA_API_URL!,
  token: process.env.PLUMA_SDK_TOKEN!,
});

const fastify = Fastify();

fastify.get('/feature', async (request, reply) => {
  const userId = 'anonymous'; // replace with user ID from your auth layer
  const flags = await flagCache.evaluator({ subjectKey: userId });
  return { enabled: flags.isEnabled('my-feature') };
});
```

## Environment variables

| Variable | Description |
|---|---|
| `PLUMA_API_URL` | Base URL of the Pluma API (e.g. `https://pluma.example.com`) |
| `PLUMA_SDK_TOKEN` | SDK token obtained from the Pluma UI |

## API reference

### `PlumaSnapshotCache.create(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | — | Base URL of the Pluma API server. Required. |
| `token` | `string` | — | SDK token. Required. |
| `ttlMs` | `number` | `30000` | Snapshot cache TTL in milliseconds. |

### `cache.evaluator(options?)`

Returns `Promise<Evaluator>`. Fetches or refreshes the snapshot if the TTL has expired.

| Option | Type | Default | Description |
|---|---|---|---|
| `subjectKey` | `string` | — | Subject identifier for allow/deny list targeting. |

### `evaluator.isEnabled(flagKey)`

Returns `boolean`. Evaluates the flag for the configured subject.
