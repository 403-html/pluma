'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Locale, Messages } from './index';
import { getDictionary } from './index';

type LocaleContextValue = {
  locale: Locale;
  t: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = useMemo(() => getDictionary(locale), [locale]);
  return (
    <LocaleContext.Provider value={{ locale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Returns the current locale and the full messages object. Must be called inside a LocaleProvider. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx === null) {
    throw new Error('useLocale() must be called inside a <LocaleProvider>.');
  }
  return ctx;
}
