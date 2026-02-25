---
sidebar_position: 1
---

# Introduction

Pluma is a full-stack application platform built for teams that need a fast, secure, and observable API layer paired with a modern web frontend.

## What it includes

- **API** — A Fastify server with OpenAPI documentation, JWT authentication, and Prisma-backed persistence.
- **App** — A Next.js web client wired directly to the API.
- **SDK** — A typed TypeScript client for consuming the Pluma API from any Node.js or browser context.
- **Docs** — This Docusaurus site, auto-generated API reference included.

## Design goals

- **Convention over configuration** — Opinionated structure so teams can ship features, not boilerplate.
- **Type safety end-to-end** — Shared types flow from the database schema through the API contract to the SDK and UI.
- **Observable by default** — Every route carries structured audit logs and OpenAPI-described schemas.

## Next steps

- Follow the [Getting Started](./getting-started) guide to run the stack locally.
- Browse the [SDK](./sdk) page to start making API calls from your own code.
- Use the **API Reference** (generated via `pnpm gen-api-docs`) for the full endpoint catalogue.
