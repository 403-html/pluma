import { getDictionary, resolveLocale } from '@/i18n';

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDictionary(resolveLocale(lang));
  return (
    <main>
      <h1>{t.home.heading}</h1>
      <p>{t.home.subheading}</p>
    </main>
  );
}
