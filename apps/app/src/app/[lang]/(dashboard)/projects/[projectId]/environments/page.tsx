'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listEnvironments,
  deleteEnvironment,
  type EnvironmentSummary,
} from '@/lib/api/environments';
import EmptyState from '@/components/EmptyState';
import { Boxes } from 'lucide-react';
import { getProject } from '@/lib/api/projects';
import { AddEnvironmentModal } from './AddEnvironmentModal';
import { EditEnvironmentModal } from './EditEnvironmentModal';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableHeadRow, TablePagination } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { CopyPill } from '@/components/CopyPill';
import { usePagination } from '@/hooks/usePagination';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; env: EnvironmentSummary };

const PAGE_SIZE = 20;

export default function EnvironmentsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingKeys = useMemo(() => environments.map(env => env.key), [environments]);
  const { currentPage, paginatedItems: paginatedEnvironments, hasPrev, hasNext, goToPrev, goToNext } = usePagination(environments, PAGE_SIZE);

  const loadEnvironments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [envsResult, projectResult] = await Promise.all([
      listEnvironments(projectId),
      getProject(projectId),
    ]);
    if (envsResult.ok) {
      setEnvironments(envsResult.environments);
    } else {
      setError(envsResult.message);
    }
    if (projectResult.ok) {
      setProjectName(projectResult.project.name);
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  async function handleDelete(id: string) {
    const toastPromise = deleteEnvironment(id).then((result) => {
      if (!result.ok) throw new Error(result.message ?? t.environments.deleteError);
    });
    await toast.promise(toastPromise, {
      pending: t.environments.toastDeletePending,
      success: t.environments.toastDeleteSuccess,
      error: { render({ data }) { return (data as Error).message; } },
    });
    setDeletingId(null);
    await loadEnvironments();
  }

  if (isLoading) {
    return (
      <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader 
          breadcrumbs={[{ label: t.projects.title, href: `/${locale}/projects` }]}
          title={projectName ?? '…'}
        />
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && environments.length === 0) {
    return (
      <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader 
          breadcrumbs={[{ label: t.projects.title, href: `/${locale}/projects` }]}
          title={projectName ?? '…'}
        />
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
      <PageHeader 
        breadcrumbs={[{ label: t.projects.title, href: `/${locale}/projects` }]}
        title={projectName ?? '…'}
        actions={
          <Button
            type="button"
            onClick={() => { setError(null); setModalState({ type: 'add' }); }}
          >
            {t.environments.newEnvironment}
          </Button>
        }
      />

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {environments.length === 0 ? (
        <EmptyState message={t.environments.emptyState} icon={Boxes} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <Table aria-label={t.environments.title}>
            <TableHeader>
              <TableHeadRow>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.environments.colName}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.environments.colKey}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.environments.colFlags}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.environments.colActions}</TableHead>
              </TableHeadRow>
            </TableHeader>
            <TableBody>
              {paginatedEnvironments.map((env) => (
                <TableRow key={env.id}>
                  <TableCell className="px-3 py-3">{env.name}</TableCell>
                  <TableCell className="px-3 py-3">
                    <CopyPill value={env.key} />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {env.flagStats.enabled}/{env.flagStats.total} on
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {deletingId === env.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-destructive">{t.environments.confirmDelete}</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(env.id)}
                        >
                          {t.environments.confirmDeleteBtn}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                        >
                          {t.environments.cancelBtn}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/${locale}/projects/${projectId}/environments/${env.id}/flags`)}
                        >
                          {t.environments.flagsBtn}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setError(null); setModalState({ type: 'edit', env }); }}
                        >
                          {t.environments.editBtn}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingId(env.id)}
                        >
                          {t.environments.deleteBtn}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(hasPrev || hasNext) && (
            <TablePagination
              currentPage={currentPage}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={goToPrev}
              onNext={goToNext}
              prevLabel={t.common.prevPage}
              nextLabel={t.common.nextPage}
              pageInfoTemplate={t.common.pageInfo}
              className="shrink-0"
            />
          )}
        </div>
      )}

      {modalState.type === 'add' && (
        <AddEnvironmentModal
          projectId={projectId}
          existingKeys={existingKeys}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            toast.success(t.environments.toastCreateSuccess);
            setModalState({ type: 'none' });
            void loadEnvironments();
          }}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditEnvironmentModal
          env={modalState.env}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            toast.success(t.environments.toastEditSuccess);
            setModalState({ type: 'none' });
            void loadEnvironments();
          }}
          onError={setError}
        />
      )}
    </main>
  );
}
