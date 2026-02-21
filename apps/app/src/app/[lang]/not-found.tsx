'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getDictionary, DEFAULT_LOCALE, isValidLocale } from '@/i18n';
import type { Locale } from '@/i18n';

export default function NotFound() {
  const params = useParams();
  const lang = params?.lang;
  const locale: Locale = isValidLocale(typeof lang === 'string' ? lang : '') ? (lang as Locale) : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  return (
    <main className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">{t.notFound.code}</h1>
        <h2 className="not-found-subtitle">{t.notFound.title}</h2>
        <p className="not-found-description">
          {t.notFound.description}
        </p>
        <Link href={`/${locale}`} className="not-found-link">
          {t.notFound.backLink}
        </Link>
      </div>
    </main>
  );
}
