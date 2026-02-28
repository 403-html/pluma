import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_PROJECT_KEY_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
} from '@pluma/types';

export type ValidationError = { ok: false; message: string };
export type ValidationResult = ValidationError | null;

/**
 * Validates an email address.
 * Returns null when valid, or a ValidationError describing why it is invalid.
 */
export function validateEmail(email: string): ValidationResult {
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) {
    return { ok: false, message: `Email must be between 1 and ${MAX_EMAIL_LENGTH} characters` };
  }
  return null;
}

/**
 * Validates a password (checks non-empty and max length only).
 * Returns null when valid, or a ValidationError describing why it is invalid.
 */
export function validatePassword(password: string): ValidationResult {
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be between 1 and ${MAX_PASSWORD_LENGTH} characters` };
  }
  return null;
}

/**
 * Validates a project/environment/flag key.
 * Returns null when valid, or a ValidationError describing why it is invalid.
 */
export function validateKey(key: string): ValidationResult {
  if (key.length === 0) {
    return { ok: false, message: 'Key is required' };
  }
  if (key.length > MAX_PROJECT_KEY_LENGTH) {
    return { ok: false, message: `Key must be ${MAX_PROJECT_KEY_LENGTH} characters or fewer` };
  }
  return null;
}

/**
 * Validates a project/environment/flag name.
 * Returns null when valid, or a ValidationError describing why it is invalid.
 */
export function validateName(name: string): ValidationResult {
  if (name.length === 0) {
    return { ok: false, message: 'Name is required' };
  }
  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return { ok: false, message: `Name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer` };
  }
  return null;
}
