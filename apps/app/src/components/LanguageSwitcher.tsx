'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import { SUPPORTED_LOCALES } from '@/i18n';
import type { Locale } from '@/i18n';

export default function LanguageSwitcher() {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(newLocale: Locale) {
    if (newLocale === locale) return;
    // pathname inside the [lang] layout always starts with '/<locale>'.
    // Split: ['', '<locale>', ...rest], replace the locale segment, rejoin.
    const parts = pathname.split('/');
    parts[1] = newLocale;
    router.push(parts.join('/'));
  }

  if (SUPPORTED_LOCALES.length < 2) return null;

  return (
    <div className="lang-switcher">
      <label htmlFor="lang-select" className="lang-switcher__label">
        {t.ui.languageSelectorLabel}
      </label>
      <select
        id="lang-select"
        className="lang-switcher__select"
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
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
