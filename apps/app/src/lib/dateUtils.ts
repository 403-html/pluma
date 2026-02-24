/**
 * Formats a date string or Date as a localised date (e.g. "24/02/2026").
 */
export function formatDate(value: string | Date, locale: string): string {
  return new Date(value).toLocaleDateString(locale);
}

/**
 * Formats a date string or Date as a localised date + time (e.g. "24/02/2026, 09:18").
 */
export function formatDateTime(value: string | Date, locale: string): string {
  return new Date(value).toLocaleString(locale);
}
