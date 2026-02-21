import { en } from './en';

export type { Messages } from './en';

export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, typeof en> = { en };

export function isValidLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Resolves a raw route param to a valid Locale, falling back to DEFAULT_LOCALE. */
export function resolveLocale(lang: string): Locale {
  return isValidLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Returns the messages object for the given locale. */
export function getDictionary(locale: Locale): typeof en {
  return dictionaries[locale];
}

export { en };
