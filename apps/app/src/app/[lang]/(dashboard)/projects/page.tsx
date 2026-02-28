'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import EmptyState from '@/components/EmptyState';
import { Layers } from 'lucide-react';
import { AddProjectModal } from './AddProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableHeadRow, TablePagination } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { CopyPill } from '@/components/CopyPill';
import { usePagination } from '@/hooks/usePagination';
import { useProjects } from './useProjects';

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const {
    projects,
    isLoading,
    error,
    modalState,
    deletingId,
    handleDeleteProject,
    openAddModal,
    openEditModal,
    closeModal,
    handleModalSuccess,
    setDeletingId,
    setError,
  } = useProjects();

  const existingKeys = useMemo(() => projects.map((p) => p.key), [projects]);
  const { currentPage, paginatedItems: paginatedProjects, hasPrev, hasNext, goToPrev, goToNext } = usePagination(projects, PAGE_SIZE);

  if (isLoading) {
    return (
      <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader title={t.projects.title} />
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && projects.length === 0) {
    return (
      <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader title={t.projects.title} />
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
      <PageHeader
        title={t.projects.title}
        actions={
          <Button type="button" onClick={openAddModal}>
            {t.projects.newProject}
          </Button>
        }
      />

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {projects.length === 0 ? (
        <EmptyState message={t.projects.emptyState} icon={Layers} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <Table aria-label={t.projects.title}>
            <TableHeader>
              <TableHeadRow>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.projects.colName}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.projects.colKey}</TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{t.projects.colActions}</TableHead>
              </TableHeadRow>
            </TableHeader>
            <TableBody>
              {paginatedProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="px-3 py-3">{project.name}</TableCell>
                  <TableCell className="px-3 py-3">
                    <CopyPill value={project.key} />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {deletingId === project.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-destructive">{t.projects.confirmDelete}</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          {t.projects.confirmDeleteBtn}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(null)}
                        >
                          {t.projects.cancelBtn}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/${locale}/projects/${project.id}/environments`)}
                        >
                          {t.projects.environmentsBtn}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(project)}
                        >
                          {t.projects.editBtn}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingId(project.id)}
                        >
                          {t.projects.deleteBtn}
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
        <AddProjectModal
          existingKeys={existingKeys}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditProjectModal
          project={modalState.project}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          onError={setError}
        />
      )}
    </main>
  );
}

