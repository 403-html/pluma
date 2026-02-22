import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';

/**
 * Slugify a string for use as a project key.
 * Lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens, trim.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Make a key unique by appending -2, -3, etc. if it already exists.
 * Ensures the result doesn't exceed MAX_PROJECT_KEY_LENGTH.
 */
export function makeKeyUnique(baseKey: string, existingKeys: string[]): string {
  const maxBaseLength = MAX_PROJECT_KEY_LENGTH - 3;
  let truncatedBase = baseKey;

  if (baseKey.length > maxBaseLength) {
    truncatedBase = baseKey.substring(0, maxBaseLength).replace(/-+$/, '');
  }

  if (!existingKeys.includes(truncatedBase)) {
    return truncatedBase;
  }

  for (let i = 2; i <= 99; i++) {
    const suffix = `-${i}`;
    const candidate = truncatedBase + suffix;

    if (candidate.length > MAX_PROJECT_KEY_LENGTH) {
      const adjustedBase = truncatedBase.substring(0, MAX_PROJECT_KEY_LENGTH - suffix.length);
      const adjustedCandidate = adjustedBase.replace(/-+$/, '') + suffix;
      if (!existingKeys.includes(adjustedCandidate)) {
        return adjustedCandidate;
      }
    } else {
      if (!existingKeys.includes(candidate)) {
        return candidate;
      }
    }
  }

  const fallbackSuffix = '-99';
  const fallbackBase = truncatedBase.substring(0, MAX_PROJECT_KEY_LENGTH - fallbackSuffix.length);
  return fallbackBase.replace(/-+$/, '') + fallbackSuffix;
}

/**
 * Validate a project key: lowercase alphanumeric with hyphens, no leading/trailing hyphens.
 */
export function isValidProjectKey(key: string): boolean {
  if (!key || key.length === 0 || key.length > MAX_PROJECT_KEY_LENGTH) {
    return false;
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key);
}
