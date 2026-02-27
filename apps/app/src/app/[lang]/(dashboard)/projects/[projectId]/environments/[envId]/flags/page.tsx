'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listFlagsForEnvironment,
  deleteFlag,
  toggleFlagEnabled,
  type FlagEntry,
} from '@/lib/api/flags';
import EmptyState from '@/components/EmptyState';
import { Flag } from 'lucide-react';
import { getProject } from '@/lib/api/projects';
import { listEnvironments } from '@/lib/api/environments';
import { Button } from '@/components/ui/button';
import { SwitchField } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableHeadRow, TablePagination } from '@/components/ui/table';
import { AddFlagModal } from './AddFlagModal';
import { EditFlagModal } from './EditFlagModal';
import { PageHeader } from '@/components/PageHeader';
import { CopyPill } from '@/components/CopyPill';
import { usePagination } from '@/hooks/usePagination';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; flag: FlagEntry };

const PAGE_SIZE = 20;

export default function FlagsPage() {
  const { t, locale } = useLocale();
  const params = useParams();
  const projectId = params.projectId as string;
  const envId = params.envId as string;
  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [envName, setEnvName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingKeys = useMemo(() => flags.map(flag => flag.key), [flags]);
  const { currentPage, paginatedItems: paginatedFlags, hasPrev, hasNext, goToPrev, goToNext } = usePagination(flags, PAGE_SIZE);

  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [flagsResult, projectResult, envsResult] = await Promise.all([
      listFlagsForEnvironment(envId),
      getProject(projectId),
      listEnvironments(projectId),
    ]);
    if (flagsResult.ok) {
      setFlags(flagsResult.flags);
    } else {
      setError(flagsResult.message);
    }
    if (projectResult.ok) {
      setProjectName(projectResult.project.name);
    }
    if (envsResult.ok) {
      const env = envsResult.environments.find(e => e.id === envId);
      if (env) setEnvName(env.name);
    }
    setIsLoading(false);
  }, [envId, projectId]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  async function handleDelete(id: string) {
    const result = await deleteFlag(id);
    setDeletingId(null);
    if (result.ok) {
      await loadFlags();
    } else {
      setError(result.message);
    }
  }

  async function handleToggle(flagId: string, currentEnabled: boolean) {
    const result = await toggleFlagEnabled(envId, flagId, !currentEnabled);
    if (result.ok) {
      await loadFlags();
    } else {
      setError(t.flags.toggleError);
    }
  }

  if (isLoading) {
    return (
      <main className="p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader 
          breadcrumbs={[
            { label: t.projects.title, href: `/${locale}/projects` },
            { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` }
          ]}
          title={envName ?? '…'}
        />
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && flags.length === 0) {
    return (
      <main className="p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader 
          breadcrumbs={[
            { label: t.projects.title, href: `/${locale}/projects` },
            { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` }
          ]}
          title={envName ?? '…'}
        />
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-8 h-screen flex flex-col overflow-hidden">
      <PageHeader 
        breadcrumbs={[
          { label: t.projects.title, href: `/${locale}/projects` },
          { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` }
        ]}
        title={envName ?? '…'}
        actions={
          <Button
            onClick={() => { setError(null); setModalState({ type: 'add' }); }}
          >
            {t.flags.newFlag}
          </Button>
        }
      />

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {flags.length === 0 ? (
        <EmptyState message={t.flags.emptyState} icon={Flag} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <Table aria-label={t.flags.title}>
            <TableHeader>
              <TableHeadRow>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.flags.colName}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.flags.colKey}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.flags.colDescription}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.flags.colStatus}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.flags.colRollout}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.flags.colActions}</TableHead>
              </TableHeadRow>
            </TableHeader>
            <TableBody>
              {paginatedFlags.map((flag) => (
                <TableRow key={flag.flagId}>
                  <TableCell className="px-3 py-3">{flag.name}</TableCell>
                  <TableCell className="px-3 py-3">
                    <CopyPill value={flag.key} />
                  </TableCell>
                  <TableCell className="px-3 py-3">{flag.description || '—'}</TableCell>
                  <TableCell className="px-3 py-3">
                    <SwitchField
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggle(flag.flagId, flag.enabled)}
                      label={flag.enabled ? t.flags.enabledLabel : t.flags.disabledLabel}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 text-sm text-muted-foreground">
                    {flag.rolloutPercentage !== null
                      ? `${flag.rolloutPercentage}%`
                      : t.flags.rolloutNotSet}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {deletingId === flag.flagId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive">{t.flags.confirmDelete}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(flag.flagId)}
                        >
                          {t.flags.confirmDeleteBtn}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                        >
                          {t.flags.cancelBtn}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setError(null); setModalState({ type: 'edit', flag }); }}
                        >
                          {t.flags.editBtn}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingId(flag.flagId)}
                        >
                          {t.flags.deleteBtn}
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
        <AddFlagModal
          projectId={projectId}
          existingKeys={existingKeys}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadFlags();
          }}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditFlagModal
          flag={modalState.flag}
          envId={envId}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadFlags();
          }}
          onError={setError}
        />
      )}
    </main>
  );
}
