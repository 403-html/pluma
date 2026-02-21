'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api/auth';
import { StatusCodes } from 'http-status-codes';
import type { Messages } from '@/i18n';

type Props = { t: Messages; lang: string };

export default function RegisterForm({ t, lang }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await register(email, password);
      if (!result.ok) {
        if (result.status === StatusCodes.CONFLICT) {
          router.push(`/${lang}/login?msg=already-configured`);
          return;
        }
        setError(result.message);
        return;
      }
      router.push(`/${lang}/login`);
    } catch {
      setError(t.register.errorFallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{t.register.title}</h1>
        <p className="auth-description">
          {t.register.description}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              {t.register.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder={t.register.emailPlaceholder}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              {t.register.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder={t.register.passwordPlaceholder}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading} className="form-button">
            {loading ? t.register.submitLoading : t.register.submitIdle}
          </button>
        </form>
        <p className="auth-footer">
          {t.register.footerText}{' '}
          <Link href={`/${lang}/login`} className="auth-link">
            {t.register.footerLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
