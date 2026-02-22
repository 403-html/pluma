'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listFlagsForEnvironment,
  deleteFlag,
  toggleFlagEnabled,
  type FlagEntry,
} from '@/lib/api/flags';
import { AddFlagModal } from './AddFlagModal';
import { EditFlagModal } from './EditFlagModal';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; flag: FlagEntry };

export default function FlagsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const envId = params.envId as string;
  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingKeys = useMemo(() => flags.map(flag => flag.key), [flags]);

  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listFlagsForEnvironment(envId);
    if (result.ok) {
      setFlags(result.flags);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, [envId]);

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
      <main className="projects-page">
        <div className="projects-page-header">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={() => router.push(`/${locale}/projects/${projectId}/environments`)}
          >
            {t.flags.backToEnvironments}
          </button>
          <h1 className="projects-page-title">{t.flags.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && flags.length === 0) {
    return (
      <main className="projects-page">
        <div className="projects-page-header">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={() => router.push(`/${locale}/projects/${projectId}/environments`)}
          >
            {t.flags.backToEnvironments}
          </button>
          <h1 className="projects-page-title">{t.flags.title}</h1>
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
          onClick={() => router.push(`/${locale}/projects/${projectId}/environments`)}
        >
          {t.flags.backToEnvironments}
        </button>
        <h1 className="projects-page-title">{t.flags.title}</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setError(null); setModalState({ type: 'add' }); }}
        >
          {t.flags.newFlag}
        </button>
      </div>

      {error && <div className="form-error projects-error">{error}</div>}

      {flags.length === 0 ? (
        <div className="projects-empty">{t.flags.emptyState}</div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>{t.flags.colName}</th>
              <th>{t.flags.colKey}</th>
              <th>{t.flags.colDescription}</th>
              <th>{t.flags.colStatus}</th>
              <th>{t.flags.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.flagId}>
                <td>{flag.name}</td>
                <td>
                  <span className="project-key-badge">{flag.key}</span>
                </td>
                <td>{flag.description || '—'}</td>
                <td>
                  <label className="flag-toggle">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={() => handleToggle(flag.flagId, flag.enabled)}
                    />
                    {flag.enabled ? t.flags.enabledLabel : t.flags.disabledLabel}
                  </label>
                </td>
                <td>
                  {deletingId === flag.flagId ? (
                    <div className="delete-confirm-actions">
                      <span className="delete-confirm-text">{t.flags.confirmDelete}</span>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => handleDelete(flag.flagId)}
                      >
                        {t.flags.confirmDeleteBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => setDeletingId(null)}
                      >
                        {t.flags.cancelBtn}
                      </button>
                    </div>
                  ) : (
                    <div className="project-actions">
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => { setError(null); setModalState({ type: 'edit', flag }); }}
                      >
                        {t.flags.editBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => setDeletingId(flag.flagId)}
                      >
                        {t.flags.deleteBtn}
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
