'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listFlagsForEnvironment,
  deleteFlag,
  toggleFlagEnabled,
  type FlagEntry,
} from '@/lib/api/flags';
import EmptyState from '@/components/EmptyState';
import { Flag } from 'lucide-react';
import { getProject } from '@/lib/api/projects';
import { listEnvironments } from '@/lib/api/environments';
import { Button } from '@/components/ui/button';
import { AddFlagModal } from './AddFlagModal';
import { EditFlagModal } from './EditFlagModal';
import { PageHeader } from '@/components/PageHeader';
import { CopyPill } from '@/components/CopyPill';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; flag: FlagEntry };

export default function FlagsPage() {
  const { t, locale } = useLocale();
  const params = useParams();
  const projectId = params.projectId as string;
  const envId = params.envId as string;
  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [envName, setEnvName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingKeys = useMemo(() => flags.map(flag => flag.key), [flags]);

  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [flagsResult, projectResult, envsResult] = await Promise.all([
      listFlagsForEnvironment(envId),
      getProject(projectId),
      listEnvironments(projectId),
    ]);
    if (flagsResult.ok) {
      setFlags(flagsResult.flags);
    } else {
      setError(flagsResult.message);
    }
    if (projectResult.ok) {
      setProjectName(projectResult.project.name);
    }
    if (envsResult.ok) {
      const env = envsResult.environments.find(e => e.id === envId);
      if (env) setEnvName(env.name);
    }
    setIsLoading(false);
  }, [envId, projectId]);

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
      <main className="p-8">
        <PageHeader 
          breadcrumbs={[
            { label: t.projects.title, href: `/${locale}/projects` },
            { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` }
          ]}
          title={envName ?? '…'}
        />
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && flags.length === 0) {
    return (
      <main className="p-8">
        <PageHeader 
          breadcrumbs={[
            { label: t.projects.title, href: `/${locale}/projects` },
            { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` }
          ]}
          title={envName ?? '…'}
        />
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <PageHeader 
        breadcrumbs={[
          { label: t.projects.title, href: `/${locale}/projects` },
          { label: projectName ?? '…', href: `/${locale}/projects/${projectId}/environments` }
        ]}
        title={envName ?? '…'}
        actions={
          <Button
            onClick={() => { setError(null); setModalState({ type: 'add' }); }}
          >
            {t.flags.newFlag}
          </Button>
        }
      />

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {flags.length === 0 ? (
        <EmptyState message={t.flags.emptyState} icon={Flag} />
      ) : (
        <table className="w-full border-collapse" aria-label={t.flags.title}>
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.flags.colName}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.flags.colKey}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.flags.colDescription}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.flags.colStatus}</th>
              <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{t.flags.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.flagId} className="transition-colors hover:bg-muted/40">
                <td className="px-3 py-3 border-b border-border/20 align-middle">{flag.name}</td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">
                  <CopyPill value={flag.key} />
                </td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">{flag.description || '—'}</td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={() => handleToggle(flag.flagId, flag.enabled)}
                      className="cursor-pointer"
                      aria-label={`${flag.name}: ${flag.enabled ? t.flags.enabledLabel : t.flags.disabledLabel}`}
                    />
                    {flag.enabled ? t.flags.enabledLabel : t.flags.disabledLabel}
                  </label>
                </td>
                <td className="px-3 py-3 border-b border-border/20 align-middle">
                  {deletingId === flag.flagId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destructive">{t.flags.confirmDelete}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(flag.flagId)}
                      >
                        {t.flags.confirmDeleteBtn}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingId(null)}
                      >
                        {t.flags.cancelBtn}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setError(null); setModalState({ type: 'edit', flag }); }}
                      >
                        {t.flags.editBtn}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingId(flag.flagId)}
                      >
                        {t.flags.deleteBtn}
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
