'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api/auth';
import { StatusCodes } from 'http-status-codes';
import { useLocale } from '@/i18n/LocaleContext';
import FormField from '@/components/FormField';
import { Button } from '@/components/ui/button';

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
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-background">
      <div className="w-full max-w-sm p-8 bg-card border border-border rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-center mb-2">{t.register.title}</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">{t.register.description}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormField id="email" label={t.register.emailLabel} type="email" value={email} onChange={setEmail} placeholder={t.register.emailPlaceholder} />
          <FormField id="password" label={t.register.passwordLabel} type="password" value={password} onChange={setPassword} placeholder={t.register.passwordPlaceholder} />
          {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.register.submitLoading : t.register.submitIdle}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          {t.register.footerText}{' '}
          <Link href={`/${locale}/login`} className="text-primary font-medium hover:underline">{t.register.footerLink}</Link>
        </p>
      </div>
      <p className="mt-8 text-xs text-muted-foreground/60 text-center">{t.poweredBy.text}</p>
    </main>
  );
}

