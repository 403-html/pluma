import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');

function readFile(relative: string): string {
  return readFileSync(resolve(ROOT, relative), 'utf8');
}

describe('upgrading.mdx', () => {
  const content = readFile('apps/docs/content/upgrading.mdx');

  it('exists and is non-empty', () => {
    expect(content.length).toBeGreaterThan(0);
  });

  it('has a top-level heading', () => {
    expect(content).toMatch(/^# Upgrading Pluma/m);
  });

  it('has a section for watching releases', () => {
    expect(content).toMatch(/^## Watch for releases/m);
  });

  it('has a backup-before-upgrade section', () => {
    expect(content).toMatch(/^## Before you upgrade/m);
  });

  it('includes pg_dump backup command', () => {
    expect(content).toContain('pg_dump');
  });

  it('has a section for updating the image tag', () => {
    expect(content).toMatch(/^## Update the image tag/m);
  });

  it('references the correct API image name', () => {
    expect(content).toContain('ghcr.io/403-html/pluma-api:');
  });

  it('references the correct app image name', () => {
    expect(content).toContain('ghcr.io/403-html/pluma-app:');
  });

  it('has a pull-and-restart section', () => {
    expect(content).toMatch(/^## Pull and restart/m);
  });

  it('includes docker compose pull command', () => {
    expect(content).toContain('docker compose pull');
  });

  it('includes docker compose up command', () => {
    expect(content).toContain('docker compose up -d');
  });

  it('has a verify section', () => {
    expect(content).toMatch(/^## Verify/m);
  });

  it('includes docker compose logs command', () => {
    expect(content).toContain('docker compose logs api');
  });

  it('mentions pinned versions vs latest', () => {
    expect(content).toContain('latest');
    expect(content).toMatch(/pinned/i);
  });

  it('links to the GitHub releases page', () => {
    expect(content).toContain('github.com/403-html/pluma/releases');
  });
});

describe('_meta.ts', () => {
  const meta = readFile('apps/docs/content/_meta.ts');

  it('registers the upgrading page', () => {
    expect(meta).toContain("upgrading");
  });

  it('places upgrading before contributing', () => {
    const upgradingIdx = meta.indexOf('upgrading');
    const contributingIdx = meta.indexOf('contributing');
    expect(upgradingIdx).toBeGreaterThan(0);
    expect(upgradingIdx).toBeLessThan(contributingIdx);
  });
});

describe('docker-compose.example.yml', () => {
  const compose = readFile('docker-compose.example.yml');

  it('references the upgrading docs', () => {
    expect(compose).toContain('pluma.to/upgrading');
  });
});
