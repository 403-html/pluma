import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import { resolveLocale } from '@/i18n';

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  try {
    // In server-side context, we need to use the full API URL
    // NEXT_PUBLIC_API_URL is required by next.config.ts
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is required');
    }
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
      credentials: 'include',
    });

    return response.ok;
  } catch {
    return false;
  }
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
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">{children}</div>
    </div>
  );
}
