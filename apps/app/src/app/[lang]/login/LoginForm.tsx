'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import type { Messages, Locale } from '@/i18n';

type Props = { t: Messages; lang: Locale };

function isSafeReturnUrl(url: string | null): url is string {
  if (typeof url !== 'string') return false;
  // Must be a relative path — starts with '/' but not '//' (protocol-relative).
  if (!url.startsWith('/') || url.startsWith('//')) return false;
  // Reject encoded control characters (e.g. %0a newline, %00 null byte).
  try {
    const decoded = decodeURIComponent(url);
    return !/[\x00-\x1f\x7f]/.test(decoded);
  } catch {
    // decodeURIComponent throws on malformed percent-encoding — reject it.
    return false;
  }
}

function LoginFormContent({ t, lang }: Props) {
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
      const result = await login(email, password, lang);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(isSafeReturnUrl(returnUrl) ? `/${lang}${returnUrl}` : `/${lang}`);
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
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              {t.login.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder={t.login.emailPlaceholder}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              {t.login.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder={t.login.passwordPlaceholder}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading} className="form-button">
            {loading ? t.login.submitLoading : t.login.submitIdle}
          </button>
        </form>
        <p className="auth-footer">
          {t.login.footerText}{' '}
          <Link href={`/${lang}/register`} className="auth-link">
            {t.login.footerLink}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginForm({ t, lang }: Props) {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <LoginFormContent t={t} lang={lang} />
    </Suspense>
  );
}
