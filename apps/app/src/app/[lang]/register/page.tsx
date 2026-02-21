import { getDictionary, resolveLocale } from '@/i18n';
import RegisterForm from './RegisterForm';

export default async function RegisterPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  return <RegisterForm t={getDictionary(locale)} lang={locale} />;
}
