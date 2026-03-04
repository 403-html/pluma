import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveLocale } from '@/i18n';
import { fetchUserRole } from '@/lib/api/auth';
import { serializeCookies } from '@/lib/api/utils';
import AuditView from './AuditView';

export default async function AuditPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const cookieHeader = serializeCookies(await cookies());
  const role = await fetchUserRole(cookieHeader);

  if (role !== 'admin' && role !== 'operator') {
    redirect(`/${locale}/`);
  }

  return <AuditView />;
}
