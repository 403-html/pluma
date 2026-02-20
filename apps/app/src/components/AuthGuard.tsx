'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

const PUBLIC_PATHS = ['/login', '/register'];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const checkAuth = async () => {
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
  };

  if (isChecking) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--color-text-muted)',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
