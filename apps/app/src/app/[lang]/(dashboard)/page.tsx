import { cookies } from 'next/headers';
import { getDictionary, resolveLocale } from '@/i18n';
import { getDashboard, EMPTY_DASHBOARD } from '@/lib/api/dashboard';
import { PageHeader } from '@/components/PageHeader';
import DashboardView from './DashboardView';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const t = getDictionary(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const result = await getDashboard(cookieHeader);
  const data = result.ok ? result.data : EMPTY_DASHBOARD;

  return (
    <main className="p-8 overflow-y-auto">
      <PageHeader title={t.dashboard.title} />
      {!result.ok && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mb-6">
          {t.dashboard.loadingError}
        </div>
      )}
      <DashboardView data={data} labels={t.dashboard} />
    </main>
  );
}

