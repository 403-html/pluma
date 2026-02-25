/**
 * Generates the OpenAPI spec from the Fastify app and writes it to
 * apps/docs/openapi.json without starting the HTTP server.
 *
 * Usage:
 *   pnpm --filter @pluma/api gen-openapi
 *
 * Run this whenever routes or schemas change, then commit the updated
 * openapi.json so that `pnpm --filter @pluma/docs gen-api-docs` works
 * without a running API server.
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { buildApp } from '../src/app.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const app = await buildApp({ logger: false });
await app.ready();

const spec = app.swagger();
const outPath = resolve(__dirname, '../../docs/openapi.json');

writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n');
console.log(`OpenAPI spec written to ${outPath}`);

await app.close();
