import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import { resolveLocale } from '@/i18n';
import { checkSession } from '@/lib/api/auth';

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  return checkSession(cookieHeader);
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-60 p-8">{children}</div>
    </div>
  );
}
