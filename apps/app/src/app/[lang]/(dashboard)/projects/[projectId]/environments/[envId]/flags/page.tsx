'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listEnvFlags,
  updateFlagConfig,
  type FlagConfigEntry,
} from '@/lib/api/flags';

export default function EnvFlagsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const envId = params.envId as string;
  const [flags, setFlags] = useState<FlagConfigEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFlags, setUpdatingFlags] = useState<Set<string>>(new Set());

  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listEnvFlags(envId);
    if (result.ok) {
      setFlags(result.data);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, [envId]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  async function handleToggle(flagId: string, currentEnabled: boolean) {
    setUpdatingFlags(prev => new Set(prev).add(flagId));
    
    setFlags(prev =>
      prev.map(f => f.flagId === flagId ? { ...f, enabled: !currentEnabled } : f)
    );

    const result = await updateFlagConfig(envId, flagId, !currentEnabled);
    
    setUpdatingFlags(prev => {
      const next = new Set(prev);
      next.delete(flagId);
      return next;
    });

    if (!result.ok) {
      setFlags(prev =>
        prev.map(f => f.flagId === flagId ? { ...f, enabled: currentEnabled } : f)
      );
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
            onClick={() => router.push(`/${locale}/projects/${projectId}/environments`)}
          >
            {t.envFlags.backToEnvironments}
          </button>
          <h1 className="projects-page-title">{t.envFlags.title}</h1>
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
            {t.envFlags.backToEnvironments}
          </button>
          <h1 className="projects-page-title">{t.envFlags.title}</h1>
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
          {t.envFlags.backToEnvironments}
        </button>
        <h1 className="projects-page-title">{t.envFlags.title}</h1>
      </div>

      {error && <div className="form-error projects-error">{error}</div>}

      {flags.length === 0 ? (
        <div className="projects-empty">{t.envFlags.emptyState}</div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>{t.envFlags.colName}</th>
              <th>{t.envFlags.colKey}</th>
              <th>{t.envFlags.colDescription}</th>
              <th>{t.envFlags.colEnabled}</th>
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
                  <input
                    type="checkbox"
                    checked={flag.enabled}
                    onChange={() => handleToggle(flag.flagId, flag.enabled)}
                    disabled={updatingFlags.has(flag.flagId)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
