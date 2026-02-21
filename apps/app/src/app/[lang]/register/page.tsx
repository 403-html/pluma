import { getDictionary, DEFAULT_LOCALE, isValidLocale } from '@/i18n';
import type { Locale } from '@/i18n';
import RegisterForm from './RegisterForm';

export default async function RegisterPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isValidLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDictionary(locale);
  return <RegisterForm t={t} lang={locale} />;
}
