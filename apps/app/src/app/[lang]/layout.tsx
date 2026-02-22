import type { Metadata } from 'next';
import '../globals.css';
import { getDictionary, SUPPORTED_LOCALES, resolveLocale } from '@/i18n';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { ThemeProvider } from '@/components/ThemeContext';

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
  return (
    <html lang={locale}>
      <body>
        {/* Anti-FOUC script: Applies theme before React hydration to prevent flash.
            Note: If using CSP headers, add nonce or allow inline scripts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pluma-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`,
          }}
        />
        <LocaleProvider locale={locale}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
