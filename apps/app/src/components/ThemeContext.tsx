'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_COOKIE = 'pluma-theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function ThemeProvider({
  children,
  initialTheme = 'system',
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      return;
    }
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      return;
    }
    // system — mirror OS preference via data-theme so CSS only needs one dark block
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function applySystemTheme(dark: boolean) {
      if (dark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    }
    function onMqChange(e: MediaQueryListEvent) {
      applySystemTheme(e.matches);
    }
    applySystemTheme(mq.matches);
    mq.addEventListener('change', onMqChange);
    return () => mq.removeEventListener('change', onMqChange);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme() must be called inside a <ThemeProvider>.');
  }
  return ctx;
}
