'use client';

import { useTheme, type Theme } from './ThemeContext';
import { useLocale } from '@/i18n/LocaleContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

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
      <Select value={theme} onValueChange={handleChange}>
        <SelectTrigger id="theme-select" className="h-7 text-xs px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">{t.ui.themeSwitcherLight}</SelectItem>
          <SelectItem value="dark">{t.ui.themeSwitcherDark}</SelectItem>
          <SelectItem value="system">{t.ui.themeSwitcherSystem}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
