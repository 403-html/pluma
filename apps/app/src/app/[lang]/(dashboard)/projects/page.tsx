'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectSummary,
} from '@/lib/api/projects';
import Modal from '@/components/Modal';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; project: ProjectSummary };

export default function ProjectsPage() {
  const { t } = useLocale();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
              <th>{t.projects.colEnvironments}</th>
              <th>{t.projects.colFlags}</th>
              <th>{t.projects.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>
                  <span className="project-key-badge">{project.key}</span>
                </td>
                <td>
                  {project.environments.length > 0
                    ? project.environments.slice(0, 256).map((env) => env.name).join(', ')
                    : t.projects.noEnvironments}
                </td>
                <td>
                  {project.flagStats.enabled}/{project.flagStats.total} on
                </td>
                <td>
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

function AddProjectModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await createProject(key, name);

    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="add-project-modal-title" title={t.projects.modalAddTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name" className="form-label">
            {t.projects.nameLabel}
          </label>
          <input
            id="project-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projects.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="project-key" className="form-label">
            {t.projects.keyLabel}
          </label>
          <input
            id="project-key"
            type="text"
            className="form-input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t.projects.keyPlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.projects.cancelBtn}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {t.projects.createBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSuccess,
  onError,
}: {
  project: ProjectSummary;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateProject(project.id, { key, name });

    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="edit-project-modal-title" title={t.projects.modalEditTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name-edit" className="form-label">
            {t.projects.nameLabel}
          </label>
          <input
            id="project-name-edit"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projects.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="project-key-edit" className="form-label">
            {t.projects.keyLabel}
          </label>
          <input
            id="project-key-edit"
            type="text"
            className="form-input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t.projects.keyPlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.projects.cancelBtn}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {t.projects.saveBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
