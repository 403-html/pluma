'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { useLocale } from '@/i18n/LocaleContext';
import FormField from '@/components/FormField';
import { Button } from '@/components/ui/button';

function isSafeReturnUrl(url: string | null): url is string {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('/') || url.startsWith('//')) return false;
  try {
    const decoded = decodeURIComponent(url);
    if (Array.from(decoded).some((c) => { const code = c.codePointAt(0) ?? 0; return code <= 0x1f || code === 0x7f; })) return false;
    return !decoded.split('?')[0].split('/').includes('..');
  } catch {
    return false;
  }
}

function LoginFormContent() {
  const { locale, t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnUrl = searchParams.get('returnUrl');
  const msg = searchParams.get('msg');
  const notice = msg === 'already-configured' ? t.login.noticeAlreadyConfigured : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, locale);
      if (!result.ok) { setError(result.message); return; }
      router.push(isSafeReturnUrl(returnUrl) ? `/${locale}${returnUrl}` : `/${locale}`);
    } catch {
      setError(t.login.errorFallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-background">
      <div className="w-full max-w-sm p-8 bg-card border border-border rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-center mb-2">{t.login.title}</h1>
        {notice && <p className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-md px-3 py-2 text-center mb-4">{notice}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormField id="email" label={t.login.emailLabel} type="email" value={email} onChange={setEmail} placeholder={t.login.emailPlaceholder} />
          <FormField id="password" label={t.login.passwordLabel} type="password" value={password} onChange={setPassword} placeholder={t.login.passwordPlaceholder} />
          {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.login.submitLoading : t.login.submitIdle}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          {t.login.footerText}{' '}
          <Link href={`/${locale}/register`} className="text-primary font-medium hover:underline">{t.login.footerLink}</Link>
        </p>
      </div>
      <p className="mt-8 text-xs text-muted-foreground/60 text-center">{t.poweredBy.text}</p>
    </main>
  );
}

function LoginFallback() {
  const { t } = useLocale();
  return <div>{t.common.loading}</div>;
}

export default function LoginForm() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormContent />
    </Suspense>
  );
}

