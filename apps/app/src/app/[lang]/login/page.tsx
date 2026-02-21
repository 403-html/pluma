import { getDictionary, DEFAULT_LOCALE, isValidLocale } from '@/i18n';
import type { Locale } from '@/i18n';
import LoginForm from './LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isValidLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  return <LoginForm t={t} lang={locale} />;
}
