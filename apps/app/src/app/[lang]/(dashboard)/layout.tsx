import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import DashboardShell from '@/components/DashboardShell';
import { resolveLocale } from '@/i18n';
import { checkSession } from '@/lib/api/auth';
import { serializeCookies } from '@/lib/api/utils';

async function checkAuth(): Promise<boolean> {
  const cookieHeader = serializeCookies(await cookies());
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
    <DashboardShell>{children}</DashboardShell>
  );
}
