import { getDictionary, DEFAULT_LOCALE, isValidLocale } from '@/i18n';
import type { Locale } from '@/i18n';

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isValidLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  return (
    <main>
      <h1>{t.home.heading}</h1>
      <p>{t.home.subheading}</p>
    </main>
  );
}
