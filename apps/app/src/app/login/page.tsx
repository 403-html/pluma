'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';

const MESSAGES: Record<string, string> = {
  'already-configured': 'An admin account already exists. Please sign in.',
};

function isSafeReturnUrl(url: string | null): url is string {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnUrl = searchParams.get('returnUrl');
  const msg = searchParams.get('msg');
  const notice = msg !== null ? (MESSAGES[msg] ?? null) : null;

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
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Sign in to Pluma</h1>
        {notice && <p className="auth-notice">{notice}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" disabled={loading} className="form-button">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footer">
          Need to set up Pluma?{' '}
          <Link href="/register" className="auth-link">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
