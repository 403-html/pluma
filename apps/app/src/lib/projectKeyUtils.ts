import slugifyLib from 'slugify';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';

/**
 * Slugify a string for use as a project key.
 * Uses the `slugify` package with strict mode (removes non-word chars).
 * Falls back to "project" if the result would otherwise be empty.
 */
export function slugify(text: string): string {
  const slug = slugifyLib(text, { lower: true, strict: true });
  return slug.length > 0 ? slug : 'project';
}

/**
 * Truncate a base key so that appending "-99" (3 chars) still fits within the limit.
 */
function truncateBase(key: string): string {
  return key.substring(0, MAX_PROJECT_KEY_LENGTH - 3).replace(/-+$/, '');
}

/**
 * Make a key unique by appending -2, -3, etc. if it already exists.
 * The result is guaranteed to be within MAX_PROJECT_KEY_LENGTH.
 */
export function makeKeyUnique(baseKey: string, existingKeys: string[]): string {
  const keySet = new Set(existingKeys);
  const base = truncateBase(baseKey);

  if (!keySet.has(base)) {
    return base;
  }

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (!keySet.has(candidate)) {
      return candidate;
    }
  }

  return `${base}-99`;
}

/**
 * Validate a project key: lowercase alphanumeric with hyphens, no leading/trailing hyphens.
 */
export function isValidProjectKey(key: string): boolean {
  if (typeof key !== 'string' || key.length === 0 || key.length > MAX_PROJECT_KEY_LENGTH) {
    return false;
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key);
}
