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
      <main className="projects-page">
        <div className="projects-page-header">
          <h1 className="projects-page-title">{t.projects.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && projects.length === 0) {
    return (
      <main className="projects-page">
        <div className="projects-page-header">
          <h1 className="projects-page-title">{t.projects.title}</h1>
        </div>
        <div className="form-error">{error}</div>
      </main>
    );
  }

  return (
    <main className="projects-page">
      <div className="projects-page-header">
        <h1 className="projects-page-title">{t.projects.title}</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setError(null); setModalState({ type: 'add' }); }}
        >
          {t.projects.newProject}
        </button>
      </div>

      {error && <div className="form-error projects-error">{error}</div>}

      {projects.length === 0 ? (
        <div className="projects-empty">{t.projects.emptyState}</div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>{t.projects.colName}</th>
              <th>{t.projects.colKey}</th>
              <th>{t.projects.colFlags}</th>
              <th>{t.projects.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/${locale}/projects/${project.id}/environments`)}
              >
                <td>{project.name}</td>
                <td>
                  <span className="project-key-badge">{project.key}</span>
                </td>
                <td>
                  {project.flagStats.enabled}/{project.flagStats.total} on
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {deletingId === project.id ? (
                    <div className="delete-confirm-actions">
                      <span className="delete-confirm-text">{t.projects.confirmDelete}</span>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => handleDelete(project.id)}
                      >
                        {t.projects.confirmDeleteBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => setDeletingId(null)}
                      >
                        {t.projects.cancelBtn}
                      </button>
                    </div>
                  ) : (
                    <div className="project-actions">
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => { setError(null); setModalState({ type: 'edit', project }); }}
                      >
                        {t.projects.editBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => setDeletingId(project.id)}
                      >
                        {t.projects.deleteBtn}
                      </button>
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

