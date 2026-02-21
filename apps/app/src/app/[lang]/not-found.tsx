'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getDictionary, resolveLocale } from '@/i18n';

export default function NotFound() {
  const params = useParams();
  const locale = resolveLocale(typeof params?.lang === 'string' ? params.lang : '');
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
