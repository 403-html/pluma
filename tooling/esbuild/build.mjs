import * as esbuild from 'esbuild';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function parseArgValue(args, key, fallback) {
  const index = args.indexOf(key);

  if (index === -1) {
    return fallback;
  }

  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    return fallback;
  }

  return value;
}

function hasFlag(args, key, fallback) {
  if (args.includes(key)) {
    return true;
  }

  const noFlag = `--no-${key.replace(/^--/, '')}`;

  if (args.includes(noFlag)) {
    return false;
  }

  return fallback;
}

const args = process.argv.slice(2);
const cwd = process.cwd();

const entry = parseArgValue(args, '--entry', 'src/index.ts');
const outfile = parseArgValue(args, '--outfile', 'dist/index.js');
const platform = parseArgValue(args, '--platform', 'node');
const format = parseArgValue(args, '--format', 'esm');
const target = parseArgValue(args, '--target', 'node20');
const packages = parseArgValue(args, '--packages', 'external');
const sourcemap = hasFlag(args, '--sourcemap', true);
const clean = hasFlag(args, '--clean', true);

const entryPoint = resolve(cwd, entry);
const outputFile = resolve(cwd, outfile);

try {
  if (clean) {
    await rm(dirname(outputFile), { recursive: true, force: true });
  }

  await esbuild.build({
    entryPoints: [entryPoint],
    outfile: outputFile,
    bundle: true,
    platform,
    format,
    target,
    packages,
    sourcemap,
  });
} catch (error) {
  console.error(error);
  process.exit(1);
}
