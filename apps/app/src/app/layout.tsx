'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';
import { AppProvider } from '@/lib/context/AppContext';
import './globals.css';

const PUBLIC_PATHS = ['/login', '/register'];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  return (
    <html lang="en">
      <body>
        <AuthGuard>
          {isPublic ? (
            children
          ) : (
            <AppProvider>
              <div className="app-layout">
                <Sidebar />
                <main className="app-main">{children}</main>
              </div>
            </AppProvider>
          )}
        </AuthGuard>
      </body>
    </html>
  );
}
