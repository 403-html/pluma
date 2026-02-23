'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import { SUPPORTED_LOCALES, isValidLocale } from '@/i18n';

export default function LanguageSwitcher() {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(value: string) {
    if (!isValidLocale(value) || value === locale) return;
    // pathname inside the [lang] layout always starts with '/<locale>'.
    // Split: ['', '<locale>', ...rest], replace the locale segment, rejoin.
    const parts = pathname.split('/');
    parts[1] = value;
    router.push(parts.join('/'));
  }

  const canSwitch = SUPPORTED_LOCALES.length >= 2;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="lang-select" className="text-xs font-medium whitespace-nowrap">
        {t.ui.languageSelectorLabel}
      </label>
      <select
        id="lang-select"
        className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        disabled={!canSwitch}
        title={canSwitch ? t.ui.languageSelectorTitle : t.ui.languageSelectorDisabledTitle}
        aria-label={canSwitch ? t.ui.languageSelectorAriaLabel : t.ui.languageSelectorDisabledAriaLabel}
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
