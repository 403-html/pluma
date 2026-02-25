---
sidebar_position: 3
---

# SDK

The Pluma SDK is a typed TypeScript client for the Pluma API. It handles authentication, request serialisation, and error normalisation so consuming code stays clean.

## Installation

```bash
# Inside a pnpm workspace
pnpm add @pluma/sdk

# Outside the monorepo (once published)
npm install @pluma/sdk
```

## Quick start

```ts
import { PlumaClient } from "@pluma/sdk";

const client = new PlumaClient({
  baseUrl: "http://localhost:3000",
});

// Authenticate
await client.auth.login({ email: "user@example.com", password: "secret" });

// Make authenticated requests
const profile = await client.users.me();
console.log(profile.email);
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `"http://localhost:3000"` | API server origin |
| `timeout` | `number` | `10000` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | `{}` | Extra headers sent with every request |

## Error handling

All SDK methods throw a `PlumaApiError` on non-2xx responses:

```ts
import { PlumaApiError } from "@pluma/sdk";

try {
  await client.users.me();
} catch (err) {
  if (err instanceof PlumaApiError) {
    console.error(err.status, err.message);
  }
}
```

## Further reading

- See the **API Reference** section (generated from the OpenAPI spec) for the full list of available endpoints and their request/response shapes.
- Source lives in `packages/sdk/` inside the monorepo.
