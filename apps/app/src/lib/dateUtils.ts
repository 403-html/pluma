/**
 * Attempts to parse a string or Date into a valid Date instance.
 * Returns null if the result would be an Invalid Date.
 */
function safeParseDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Formats a date string or Date as a localised date (e.g. "24/02/2026").
 */
export function formatDate(value: string | Date, locale: string): string {
  const date = safeParseDate(value);

  if (!date) {
    return '';
  }

  return date.toLocaleDateString(locale);
}

/**
 * Formats a date string or Date as a localised date + time (e.g. "24/02/2026, 09:18").
 */
export function formatDateTime(value: string | Date, locale: string): string {
  const date = safeParseDate(value);

  if (!date) {
    return '';
  }

  return date.toLocaleString(locale);
}
