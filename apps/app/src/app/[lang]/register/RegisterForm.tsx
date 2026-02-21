'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api/auth';
import { StatusCodes } from 'http-status-codes';
import { useLocale } from '@/i18n/LocaleContext';
import FormField from '@/components/FormField';

export default function RegisterForm() {
  const { locale, t } = useLocale();
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
      const result = await register(email, password, locale);
      if (!result.ok) {
        if (result.status === StatusCodes.CONFLICT) {
          router.push(`/${locale}/login?msg=already-configured`);
          return;
        }
        setError(result.message);
        return;
      }
      router.push(`/${locale}/login`);
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
        <p className="auth-description">{t.register.description}</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <FormField id="email" label={t.register.emailLabel} type="email" value={email} onChange={setEmail} placeholder={t.register.emailPlaceholder} />
          <FormField id="password" label={t.register.passwordLabel} type="password" value={password} onChange={setPassword} placeholder={t.register.passwordPlaceholder} />
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading} className="form-button">
            {loading ? t.register.submitLoading : t.register.submitIdle}
          </button>
        </form>
        <p className="auth-footer">
          {t.register.footerText}{' '}
          <Link href={`/${locale}/login`} className="auth-link">{t.register.footerLink}</Link>
        </p>
      </div>
    </main>
  );
}

