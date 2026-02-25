---
name: debugging-locally
description: Log-based and breakpoint-based debug guide for the Pluma API and SDK
---

This skill covers the two primary debugging approaches in Pluma: structured log inspection and Node.js inspector-based breakpoint debugging. The API is a Fastify server; the SDK is a pure TypeScript library.

## Log-Based Debugging (Recommended First Step)

### Enable Pretty-Print Logs

The Fastify API emits structured JSON logs. In development, set `NODE_ENV=development` to activate pretty-printing via `pino-pretty`:

```bash
NODE_ENV=development pnpm --filter @pluma/api dev
```

Log output becomes human-readable with coloured levels, timestamps, and request IDs:

```
[12:34:56.789] INFO: Server listening
    url: "http://0.0.0.0:2137"
[12:34:57.001] INFO: incoming request
    reqId: "req-1"  method: "GET"  url: "/api/v1/flags"
```

### Increase Log Verbosity

To log at `trace` level (all internal Fastify lifecycle events), set `LOG_LEVEL=trace` in `apps/api/.env` or inline:

```bash
LOG_LEVEL=trace NODE_ENV=development pnpm --filter @pluma/api dev
```

### Inspecting a Specific Request

Each request gets a `reqId`. Pipe logs through `jq` to filter:

```bash
NODE_ENV=production pnpm --filter @pluma/api dev 2>&1 | jq 'select(.reqId == "req-3")'
```

## Breakpoint Debugging (Node.js Inspector)

The API runs via `tsx watch src/index.ts`. To attach a debugger:

### Step 1: Start the API with `--inspect`

```bash
cd apps/api
node --inspect --loader tsx/esm src/index.ts
```

Or set the flag via the environment to avoid modifying scripts:

```bash
NODE_OPTIONS="--inspect" pnpm --filter @pluma/api dev
```

The inspector binds to `127.0.0.1:9229` by default. Output confirms:

```
Debugger listening on ws://127.0.0.1:9229/<uuid>
```

### Step 2: Attach Your Debugger

**VS Code** — add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Pluma API",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Then press **F5** (or Run → Start Debugging → "Attach to Pluma API").

**Chrome DevTools** — open `chrome://inspect`, click **Open dedicated DevTools for Node**.

### Step 3: Set Breakpoints

Set breakpoints in `apps/api/src/**/*.ts`. `tsx` handles the TypeScript → JS mapping; source maps are active by default so breakpoints hit the `.ts` lines.

## Debugging the SDK

The SDK is a pure TypeScript library with no server process. Debug via Vitest:

```bash
cd packages/sdk
pnpm vitest --reporter=verbose
```

For breakpoints in SDK tests:

```bash
node --inspect-brk --loader tsx/esm node_modules/.bin/vitest run
```

Attach VS Code using the same launch config above (port `9229`).

## Common Scenarios

| Symptom | Debug approach |
|---|---|
| Request returns unexpected 4xx/5xx | Enable `LOG_LEVEL=trace`; inspect request/response lifecycle logs |
| Route handler not reached | Check Fastify plugin registration logs at `debug` level |
| Prisma query behaves unexpectedly | Set `DEBUG="prisma:query"` env var to log all SQL |
| SDK returns wrong snapshot | Add `--reporter=verbose` to Vitest; set breakpoint in `index.test.ts` |
| Hot-reload not picking up changes | Confirm `tsx watch` is running (not plain `node`); check for TS compile errors |

### Enable Prisma Query Logging

```bash
DEBUG="prisma:query" NODE_ENV=development pnpm --filter @pluma/api dev
```

Every SQL statement is printed to stderr with parameters and duration.

## When to Invoke This Skill

Invoke this skill when:
- A route returns an unexpected response and log output is insufficient
- Stepping through request handling logic to understand execution flow
- Debugging a Prisma query producing wrong results
- Investigating a failing SDK test at the source level
