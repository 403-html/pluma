'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listProjects,
  deleteProject,
  type ProjectSummary,
} from '@/lib/api/projects';
import EmptyState from '@/components/EmptyState';
import { Layers } from 'lucide-react';
import { AddProjectModal } from './AddProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableHeadRow, TablePagination } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { CopyPill } from '@/components/CopyPill';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; project: ProjectSummary };

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const existingKeys = useMemo(() => projects.map(p => p.key), [projects]);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listProjects();
    if (result.ok) {
      setProjects(result.projects);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const totalPages = Math.ceil(projects.length / PAGE_SIZE);
    setCurrentPage((prevPage) => {
      const maxPage = Math.max(1, totalPages);
      if (prevPage > maxPage) {
        return maxPage;
      }
      return prevPage;
    });
  }, [projects.length]);

  async function handleDelete(id: string) {
    const result = await deleteProject(id);
    setDeletingId(null);
    if (result.ok) {
      await loadProjects();
    } else {
      setError(result.message);
    }
  }

  if (isLoading) {
    return (
      <main className="p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader title={t.projects.title} />
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && projects.length === 0) {
    return (
      <main className="p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader title={t.projects.title} />
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  const totalPages = Math.ceil(projects.length / PAGE_SIZE);
  const paginatedProjects = projects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <main className="p-8 h-screen flex flex-col overflow-hidden">
      <PageHeader 
        title={t.projects.title}
        actions={
          <Button
            type="button"
            onClick={() => { setError(null); setModalState({ type: 'add' }); }}
          >
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
                <TableRow
                  key={project.id}
                  className="cursor-pointer"
                  onClick={() => {
                    if (window.getSelection()?.toString()) return;
                    router.push(`/${locale}/projects/${project.id}/environments`);
                  }}
                >
                  <TableCell className="px-3 py-3"><span className="cursor-text" onClick={(e) => e.stopPropagation()}>{project.name}</span></TableCell>
                  <TableCell className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <CopyPill value={project.key} />
                  </TableCell>
                  <TableCell className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {deletingId === project.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-destructive">{t.projects.confirmDelete}</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(project.id)}
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
                          onClick={() => { setError(null); setModalState({ type: 'edit', project }); }}
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
              onPrev={() => setCurrentPage(p => p - 1)}
              onNext={() => setCurrentPage(p => p + 1)}
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
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadProjects();
          }}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditProjectModal
          project={modalState.project}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadProjects();
          }}
          onError={setError}
        />
      )}
    </main>
  );
}

