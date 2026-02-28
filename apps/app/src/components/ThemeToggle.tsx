'use client';

import { useTheme, type Theme } from './ThemeContext';
import { useLocale } from '@/i18n/LocaleContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  function handleChange(value: string) {
    if (value === 'light' || value === 'dark' || value === 'system') {
      setTheme(value as Theme);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-select" className="text-xs font-medium whitespace-nowrap">
        {t.ui.themeSwitcherLabel}
      </label>
      <select
        id="theme-select"
        className="text-xs border border-border rounded px-2 py-1 pr-8 bg-background text-foreground cursor-pointer"
        value={theme}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="light">{t.ui.themeSwitcherLight}</option>
        <option value="dark">{t.ui.themeSwitcherDark}</option>
        <option value="system">{t.ui.themeSwitcherSystem}</option>
      </select>
    </div>
  );
}
