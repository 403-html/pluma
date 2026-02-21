import { getDictionary, resolveLocale } from '@/i18n';
import LoginForm from './LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  return <LoginForm t={getDictionary(locale)} lang={locale} />;
}
