# @pluma-flags/sdk

Client SDK for evaluating feature flags from a
[Pluma](https://github.com/403-html/pluma) self-hosted feature flag server.

Fetches a flag snapshot from the Pluma API and evaluates flags locally; no
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

## Documentation

For the full documentation — framework examples (Express, Next.js), per-subject
targeting, caching behaviour, parent flags, and API reference — see the
**[Pluma SDK docs](https://pluma.to/sdk)**.
