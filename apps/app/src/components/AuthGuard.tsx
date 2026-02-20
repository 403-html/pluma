'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { PUBLIC_PATHS } from '@/lib/constants';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    try {
      await auth.me();
      setIsAuthorized(true);
    } catch {
      router.push('/login');
    } finally {
      setIsChecking(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen text-ink-muted">
        Loading...
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
