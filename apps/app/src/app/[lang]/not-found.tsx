'use client';

import Link from 'next/link';
import { useLocale } from '@/i18n/LocaleContext';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const { locale, t } = useLocale();
  return (
    <main className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold mb-2">{t.notFound.code}</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground mb-4">{t.notFound.title}</h2>
        <p className="text-muted-foreground mb-8">
          {t.notFound.description}
        </p>
        <Button asChild>
          <Link href={`/${locale}`}>
            {t.notFound.backLink}
          </Link>
        </Button>
      </div>
    </main>
  );
}
