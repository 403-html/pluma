import type { Metadata } from 'next';
import '../globals.css';
import { getDictionary, SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale } from '@/i18n';
import type { Locale } from '@/i18n';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isValidLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  return {
    title: t.metadata.title,
    description: t.metadata.description,
  };
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale: Locale = isValidLocale(lang) ? lang : DEFAULT_LOCALE;
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
