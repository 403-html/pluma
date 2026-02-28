'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import EmptyState from '@/components/EmptyState';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableHeadRow, TablePagination } from '@/components/ui/table';
import { AddFlagModal } from './AddFlagModal';
import { EditFlagModal } from './EditFlagModal';
import { PageHeader } from '@/components/PageHeader';
import { usePagination } from '@/hooks/usePagination';
import { buildOrderedFlags } from '@/lib/flagUtils';
import { FlagRow } from './FlagRow';
import { useFlags } from './useFlags';

const PAGE_SIZE = 20;

export default function FlagsPage() {
  const { t, locale } = useLocale();
  const params = useParams();
  const projectId = params.projectId as string;
  const envId = params.envId as string;

  const {
    flags,
    isLoading,
    error,
    modalState,
    deletingId,
    togglingIds,
    projectName,
    envName,
    handleToggleFlag,
    handleDeleteFlag,
    handleAddFlag,
    handleEditFlag,
    openAddSubModal,
    cancelDelete,
    closeModal,
    handleModalSuccess,
    setDeletingId,
    setError,
  } = useFlags(envId, projectId);

  const existingKeys = useMemo(() => flags.map((flag) => flag.key), [flags]);
  const orderedFlags = useMemo(() => buildOrderedFlags(flags), [flags]);
  const { currentPage, paginatedItems: paginatedOrdered, hasPrev, hasNext, goToPrev, goToNext } = usePagination(orderedFlags, PAGE_SIZE);

  if (isLoading) {
    return (
      <main className="p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader
          breadcrumbs={[
            { label: t.projects.title, href: `/${locale}/projects` },
            { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` },
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
            { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` },
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
          { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` },
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
                  onToggle={handleToggleFlag}
                  onDeleteStart={setDeletingId}
                  onDeleteCancel={cancelDelete}
                  onDelete={handleDeleteFlag}
                  onEdit={handleEditFlag}
                  onAddSub={openAddSubModal}
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
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}

      {modalState.type === 'addSub' && (
        <AddFlagModal
          projectId={projectId}
          existingKeys={existingKeys}
          parentFlag={modalState.parentFlag}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditFlagModal
          flag={modalState.flag}
          envId={envId}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}
    </main>
  );
}
