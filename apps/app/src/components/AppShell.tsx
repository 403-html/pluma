'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { AppProvider } from '@/lib/context/AppContext';
import { PUBLIC_PATHS } from '@/lib/constants';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <AppProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </AppProvider>
  );
}
