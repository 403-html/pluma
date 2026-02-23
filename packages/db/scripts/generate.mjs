#!/usr/bin/env node
// Cross-platform postinstall: run `prisma generate` with a fallback DATABASE_URL
// so it works immediately after `pnpm install` even without a configured .env.
import { execFileSync } from 'node:child_process';

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://placeholder',
};

execFileSync('prisma', ['generate'], { env, stdio: 'inherit' });
