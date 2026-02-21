'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { getMessages } from '@/i18n';

function isSafeReturnUrl(url: string | null): url is string {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');
}

function LoginForm() {
  const t = getMessages();
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
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(isSafeReturnUrl(returnUrl) ? returnUrl : '/');
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
          <Link href="/register" className="auth-link">
            {t.login.footerLink}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
