'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { useLocale } from '@/i18n/LocaleContext';
import FormField from '@/components/FormField';

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
    <main className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{t.login.title}</h1>
        {notice && <p className="auth-notice">{notice}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <FormField id="email" label={t.login.emailLabel} type="email" value={email} onChange={setEmail} placeholder={t.login.emailPlaceholder} />
          <FormField id="password" label={t.login.passwordLabel} type="password" value={password} onChange={setPassword} placeholder={t.login.passwordPlaceholder} />
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading} className="form-button">
            {loading ? t.login.submitLoading : t.login.submitIdle}
          </button>
        </form>
        <p className="auth-footer">
          {t.login.footerText}{' '}
          <Link href={`/${locale}/register`} className="auth-link">{t.login.footerLink}</Link>
        </p>
      </div>
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

