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
import { Table, TableHeader, TableBody, TableHead, TableHeadRow, TablePagination } from '@/components/ui/table';
import { AddFlagModal } from './AddFlagModal';
import { EditFlagModal } from './EditFlagModal';
import { PageHeader } from '@/components/PageHeader';
import { usePagination } from '@/hooks/usePagination';
import { buildOrderedFlags } from '@/lib/flagUtils';
import { FlagRow } from './FlagRow';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'addSub'; parentFlag: { flagId: string; name: string; key: string } }
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
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const existingKeys = useMemo(() => flags.map(flag => flag.key), [flags]);
  const orderedFlags = useMemo(() => buildOrderedFlags(flags), [flags]);
  const { currentPage, paginatedItems: paginatedOrdered, hasPrev, hasNext, goToPrev, goToNext } = usePagination(orderedFlags, PAGE_SIZE);

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

  const handleToggle = useCallback(async (flagId: string, currentEnabled: boolean) => {
    setTogglingIds(prev => new Set(prev).add(flagId));
    setFlags(prev =>
      prev.map(f => (f.flagId === flagId ? { ...f, enabled: !currentEnabled } : f))
    );
    const result = await toggleFlagEnabled(envId, flagId, !currentEnabled);
    if (!result.ok) {
      setFlags(prev =>
        prev.map(f => (f.flagId === flagId ? { ...f, enabled: currentEnabled } : f))
      );
      setError(t.flags.toggleError);
    }
    setTogglingIds(prev => {
      const next = new Set(prev);
      next.delete(flagId);
      return next;
    });
  }, [envId, t.flags.toggleError]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteFlag(id);
    setDeletingId(null);
    if (result.ok) {
      await loadFlags();
    } else {
      setError(result.message);
    }
  }, [loadFlags]);

  const handleDeleteStart = useCallback((id: string) => setDeletingId(id), []);
  const handleDeleteCancel = useCallback(() => setDeletingId(null), []);

  const handleAddFlag = useCallback(() => {
    setError(null);
    setModalState({ type: 'add' });
  }, []);

  const handleEditFlag = useCallback((flag: FlagEntry) => {
    setError(null);
    setModalState({ type: 'edit', flag });
  }, []);

  const handleAddSubFlag = useCallback((parentFlag: { flagId: string; name: string; key: string }) => {
    setError(null);
    setModalState({ type: 'addSub', parentFlag });
  }, []);

  const handleModalClose = useCallback(() => setModalState({ type: 'none' }), []);

  const handleModalSuccess = useCallback(() => {
    setModalState({ type: 'none' });
    loadFlags();
  }, [loadFlags]);

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
      <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
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
    <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
      <PageHeader 
        breadcrumbs={[
          { label: t.projects.title, href: `/${locale}/projects` },
          { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` }
        ]}
        title={envName ?? '…'}
        actions={
          <Button onClick={handleAddFlag}>
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
              {paginatedOrdered.map(({ flag, depth, indentPx }) => (
                <FlagRow
                  key={flag.flagId}
                  flag={flag}
                  depth={depth}
                  indentPx={indentPx}
                  isDeleting={deletingId === flag.flagId}
                  isToggling={togglingIds.has(flag.flagId)}
                  onToggle={handleToggle}
                  onDeleteStart={handleDeleteStart}
                  onDeleteCancel={handleDeleteCancel}
                  onDelete={handleDelete}
                  onEdit={handleEditFlag}
                  onAddSub={handleAddSubFlag}
                />
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
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}

      {modalState.type === 'addSub' && (
        <AddFlagModal
          projectId={projectId}
          existingKeys={existingKeys}
          parentFlag={modalState.parentFlag}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditFlagModal
          flag={modalState.flag}
          envId={envId}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}
    </main>
  );
}
