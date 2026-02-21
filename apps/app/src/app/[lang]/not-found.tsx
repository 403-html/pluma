'use client';

import Link from 'next/link';
import { useLocale } from '@/i18n/LocaleContext';

export default function NotFound() {
  const { locale, t } = useLocale();
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
