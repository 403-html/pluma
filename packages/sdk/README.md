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

## Framework examples

Full integration guides are available in the Pluma documentation:

- [JavaScript / Node.js (Express.js)](https://403-html.github.io/pluma/sdk/javascript)
- [React / Next.js (Server Components)](https://403-html.github.io/pluma/sdk/react)

## Per-subject targeting

Pass the user's ID (or any numeric-based identifier) as `subjectKey` to
`evaluator()`. The value must match exactly what is stored in the allow/deny
lists in the Pluma UI; those lists are populated with known user IDs. Evaluation
precedence for each flag:

1. **Deny list**: if `subjectKey` is in `denyList`, returns `false` immediately.
2. **Allow list**: if `subjectKey` is in `allowList`, returns `true`
   immediately.
3. **Rollout percentage**: if set (not `null`), a deterministic FNV-1a 32-bit
   hash of `subjectKey:flagKey` assigns the subject to a bucket in `[0, 100)`.
   Returns `true` if the bucket falls within the percentage.
4. **Parent inheritance**: if `inheritParent` is set and the flag has a parent,
   evaluation walks up the parent chain.
5. **Base enabled state**: returns the flag's `enabled` value.

If `subjectKey` is omitted, steps 1–3 are skipped (allow/deny lists and rollout
are not evaluated). The flag resolves purely from parent inheritance and its
base enabled state.

## Caching

`PlumaSnapshotCache` uses a lazy TTL-based cache (default **30 seconds**). The
snapshot is fetched on the first `evaluator()` call and reused until the TTL
expires. There is no background polling.

- **Create the cache once**: at module level or in application startup. Creating
  a new instance per request defeats the cache entirely.
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

| Field     | Type     | Required | Default | Description                             |
| --------- | -------- | -------- | ------- | --------------------------------------- |
| `baseUrl` | `string` | yes      | (none)  | Base URL of the Pluma API server        |
| `token`   | `string` | yes      | (none)  | SDK token from Organisation -> API Keys |
| `ttlMs`   | `number` | no       | `30000` | Snapshot cache TTL in milliseconds      |

### `EvaluatorOptions`

| Field        | Type     | Required | Description                                                          |
| ------------ | -------- | -------- | -------------------------------------------------------------------- |
| `subjectKey` | `string` | no       | User ID or numeric-based identifier matched against allow/deny lists |

### `Evaluator`

| Member      | Signature                      | Description                                    |
| ----------- | ------------------------------ | ---------------------------------------------- |
| `isEnabled` | `(flagKey: string) => boolean` | Evaluates the flag for the configured subject. |
