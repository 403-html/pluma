'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listProjects,
  deleteProject,
  type ProjectSummary,
} from '@/lib/api/projects';
import { AddProjectModal } from './AddProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { Button } from '@/components/ui/button';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; project: ProjectSummary };

export default function ProjectsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <main className="p-8 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">{t.projects.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && projects.length === 0) {
    return (
      <main className="p-8 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">{t.projects.title}</h1>
        </div>
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">{t.projects.title}</h1>
        <Button
          type="button"
          onClick={() => { setError(null); setModalState({ type: 'add' }); }}
        >
          {t.projects.newProject}
        </Button>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{t.projects.emptyState}</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.projects.colName}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.projects.colKey}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.projects.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => {
                  if (window.getSelection()?.toString()) return;
                  router.push(`/${locale}/projects/${project.id}/environments`);
                }}
              >
                <td className="px-3 py-3 border-b border-border/20 align-middle"><span className="cursor-text" onClick={(e) => e.stopPropagation()}>{project.name}</span></td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground inline-block" onClick={(e) => e.stopPropagation()}>{project.key}</span>
                </td>
                <td className="px-3 py-3 border-b border-border/20 align-middle" onClick={(e) => e.stopPropagation()}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

