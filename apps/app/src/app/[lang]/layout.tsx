import type { Metadata } from 'next';
import { getDictionary, SUPPORTED_LOCALES, resolveLocale } from '@/i18n';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { ThemeProvider, type Theme } from '@/components/ThemeContext';
import { ToastProvider } from '@/components/ToastProvider';
import { cookies } from 'next/headers';

const THEME_COOKIE = 'pluma-theme';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(resolveLocale(lang));
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
  const locale = resolveLocale(lang);
  const cookieStore = await cookies();
  const raw = cookieStore.get(THEME_COOKIE)?.value;
  const initialTheme: Theme = (raw === 'light' || raw === 'dark' || raw === 'system') ? raw : 'system';
  return (
    <LocaleProvider locale={locale}>
      <ThemeProvider initialTheme={initialTheme}>
        {children}
        <ToastProvider />
      </ThemeProvider>
    </LocaleProvider>
  );
}
