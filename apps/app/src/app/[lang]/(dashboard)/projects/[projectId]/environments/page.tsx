'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listEnvironments,
  deleteEnvironment,
  type EnvironmentSummary,
} from '@/lib/api/environments';
import { AddEnvironmentModal } from './AddEnvironmentModal';
import { EditEnvironmentModal } from './EditEnvironmentModal';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; env: EnvironmentSummary };

export default function EnvironmentsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingKeys = useMemo(() => environments.map(env => env.key), [environments]);

  const loadEnvironments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listEnvironments(projectId);
    if (result.ok) {
      setEnvironments(result.environments);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  async function handleDelete(id: string) {
    const result = await deleteEnvironment(id);
    setDeletingId(null);
    if (result.ok) {
      await loadEnvironments();
    } else {
      setError(result.message);
    }
  }

  if (isLoading) {
    return (
      <main className="projects-page">
        <div className="projects-page-header">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={() => router.push(`/${locale}/projects`)}
          >
            {t.environments.backToProjects}
          </button>
          <h1 className="projects-page-title">{t.environments.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && environments.length === 0) {
    return (
      <main className="projects-page">
        <div className="projects-page-header">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={() => router.push(`/${locale}/projects`)}
          >
            {t.environments.backToProjects}
          </button>
          <h1 className="projects-page-title">{t.environments.title}</h1>
        </div>
        <div className="form-error">{error}</div>
      </main>
    );
  }

  return (
    <main className="projects-page">
      <div className="projects-page-header">
        <button
          type="button"
          className="btn-sm btn-sm--edit"
          onClick={() => router.push(`/${locale}/projects`)}
        >
          {t.environments.backToProjects}
        </button>
        <h1 className="projects-page-title">{t.environments.title}</h1>
        <button
          type="button"
          className="btn-sm btn-sm--edit"
          onClick={() => router.push(`/${locale}/projects/${projectId}/flags`)}
        >
          {t.environments.manageFlags}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setError(null); setModalState({ type: 'add' }); }}
        >
          {t.environments.newEnvironment}
        </button>
      </div>

      {error && <div className="form-error projects-error">{error}</div>}

      {environments.length === 0 ? (
        <div className="projects-empty">{t.environments.emptyState}</div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>{t.environments.colName}</th>
              <th>{t.environments.colKey}</th>
              <th>{t.environments.colFlags}</th>
              <th>{t.environments.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {environments.map((env) => (
              <tr key={env.id}>
                <td>{env.name}</td>
                <td>
                  <span className="project-key-badge">{env.key}</span>
                </td>
                <td>
                  {env.flagStats.enabled}/{env.flagStats.total} on
                  <button
                    type="button"
                    className="btn-sm btn-sm--edit"
                    onClick={() => router.push(`/${locale}/projects/${projectId}/environments/${env.id}/flags`)}
                    style={{ marginLeft: '8px' }}
                  >
                    {t.environments.flags}
                  </button>
                </td>
                <td>
                  {deletingId === env.id ? (
                    <div className="delete-confirm-actions">
                      <span className="delete-confirm-text">{t.environments.confirmDelete}</span>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => handleDelete(env.id)}
                      >
                        {t.environments.confirmDeleteBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => setDeletingId(null)}
                      >
                        {t.environments.cancelBtn}
                      </button>
                    </div>
                  ) : (
                    <div className="project-actions">
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => { setError(null); setModalState({ type: 'edit', env }); }}
                      >
                        {t.environments.editBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => setDeletingId(env.id)}
                      >
                        {t.environments.deleteBtn}
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
        <AddEnvironmentModal
          projectId={projectId}
          existingKeys={existingKeys}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadEnvironments();
          }}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditEnvironmentModal
          env={modalState.env}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadEnvironments();
          }}
          onError={setError}
        />
      )}
    </main>
  );
}
