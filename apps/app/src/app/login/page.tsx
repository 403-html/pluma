'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.login(email, password);
      router.push('/projects');
    } catch (err) {
      if (err instanceof ApiError) {
        setError('Invalid credentials');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="w-full max-w-md p-8 bg-card border border-stroke">
        <div className="w-12 h-12 bg-accent mx-auto mb-6" role="img" aria-label="Pluma" />
        <h1 className="text-2xl font-semibold text-ink mb-8 text-center">Sign In</h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && <div className="bg-red-900/20 border border-red-800/30 text-red-300 p-4 text-sm">{error}</div>}

          <label className="block">
            <span className="block text-label text-ink-muted font-medium uppercase tracking-wider mb-2">Email</span>
            <input
              type="email"
              className="w-full px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="block">
            <span className="block text-label text-ink-muted font-medium uppercase tracking-wider mb-2">Password</span>
            <input
              type="password"
              className="w-full px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="w-full px-6 py-2.5 bg-accent text-surface font-semibold text-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          New to Pluma?{' '}
          <Link href="/register" className="text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
