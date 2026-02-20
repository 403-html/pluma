'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
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
      <div className="w-full max-w-sm p-6 bg-card border border-stroke">
        <div className="w-8 h-8 bg-accent mb-5" role="img" aria-label="Pluma logo" />
        <h1 className="text-lg font-semibold text-ink mb-6">Sign In</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <div className="bg-red-900/20 border border-red-800/30 text-red-300 p-3 text-xs">{error}</div>}

          <label className="block">
            <span className="block text-label text-ink-dim font-medium uppercase tracking-wider mb-1">Email</span>
            <input
              type="email"
              className="w-full px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="block">
            <span className="block text-label text-ink-dim font-medium uppercase tracking-wider mb-1">Password</span>
            <input
              type="password"
              className="w-full px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-accent text-surface font-semibold text-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-5 text-xs text-ink-muted">
          New to Pluma?{' '}
          <Link href="/register" className="text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
