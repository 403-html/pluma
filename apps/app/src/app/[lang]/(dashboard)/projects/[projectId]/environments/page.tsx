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
import { Button } from '@/components/ui/button';

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
      <main className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${locale}/projects`)}
          >
            {t.environments.backToProjects}
          </Button>
          <h1 className="text-2xl font-semibold">{t.environments.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && environments.length === 0) {
    return (
      <main className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${locale}/projects`)}
          >
            {t.environments.backToProjects}
          </Button>
          <h1 className="text-2xl font-semibold">{t.environments.title}</h1>
        </div>
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push(`/${locale}/projects`)}
        >
          {t.environments.backToProjects}
        </Button>
        <h1 className="text-2xl font-semibold">{t.environments.title}</h1>
        <Button
          type="button"
          className="ml-auto"
          onClick={() => { setError(null); setModalState({ type: 'add' }); }}
        >
          {t.environments.newEnvironment}
        </Button>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {environments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{t.environments.emptyState}</div>
      ) : (
        <table className="w-full border-collapse" aria-label={t.environments.title}>
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.environments.colName}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.environments.colKey}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.environments.colFlags}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.environments.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {environments.map((env) => (
              <tr key={env.id} className="transition-colors hover:bg-muted/40">
                <td className="px-3 py-3 border-b border-border/20 align-middle">{env.name}</td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground inline-block">{env.key}</span>
                </td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">
                  {env.flagStats.enabled}/{env.flagStats.total} on
                </td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">
                  {deletingId === env.id ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-destructive">{t.environments.confirmDelete}</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(env.id)}
                      >
                        {t.environments.confirmDeleteBtn}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingId(null)}
                      >
                        {t.environments.cancelBtn}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/${locale}/projects/${projectId}/environments/${env.id}/flags`)}
                      >
                        {t.environments.flagsBtn}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setError(null); setModalState({ type: 'edit', env }); }}
                      >
                        {t.environments.editBtn}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingId(env.id)}
                      >
                        {t.environments.deleteBtn}
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
