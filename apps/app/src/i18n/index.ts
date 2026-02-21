import { en } from './en';

export type { Messages } from './en';

export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, typeof en> = { en };

export function isValidLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Returns the messages object for the given locale. */
export function getDictionary(locale: Locale): typeof en {
  return dictionaries[locale];
}

export { en };
