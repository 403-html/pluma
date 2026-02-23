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
import { Button } from '@/components/ui/button';
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
      <main className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/${locale}/projects/${projectId}/environments`)}
          >
            {t.flags.backToEnvironments}
          </Button>
          <h1 className="text-2xl font-semibold">{t.flags.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && flags.length === 0) {
    return (
      <main className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/${locale}/projects/${projectId}/environments`)}
          >
            {t.flags.backToEnvironments}
          </Button>
          <h1 className="text-2xl font-semibold">{t.flags.title}</h1>
        </div>
        <div className="text-sm text-destructive">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/${locale}/projects/${projectId}/environments`)}
        >
          {t.flags.backToEnvironments}
        </Button>
        <h1 className="text-2xl font-semibold">{t.flags.title}</h1>
        <Button
          onClick={() => { setError(null); setModalState({ type: 'add' }); }}
        >
          {t.flags.newFlag}
        </Button>
      </div>

      {error && <div className="text-sm text-destructive mb-4">{error}</div>}

      {flags.length === 0 ? (
        <div className="text-muted-foreground">{t.flags.emptyState}</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium">{t.flags.colName}</th>
              <th className="text-left py-3 px-4 font-medium">{t.flags.colKey}</th>
              <th className="text-left py-3 px-4 font-medium">{t.flags.colDescription}</th>
              <th className="text-left py-3 px-4 font-medium">{t.flags.colStatus}</th>
              <th className="text-left py-3 px-4 font-medium">{t.flags.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.flagId} className="border-b hover:bg-muted/50">
                <td className="py-3 px-4">{flag.name}</td>
                <td className="py-3 px-4">
                  <span className="inline-block bg-muted px-2 py-1 rounded text-sm font-mono">{flag.key}</span>
                </td>
                <td className="py-3 px-4">{flag.description || '—'}</td>
                <td className="py-3 px-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={() => handleToggle(flag.flagId, flag.enabled)}
                      className="cursor-pointer"
                    />
                    {flag.enabled ? t.flags.enabledLabel : t.flags.disabledLabel}
                  </label>
                </td>
                <td className="py-3 px-4">
                  {deletingId === flag.flagId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t.flags.confirmDelete}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(flag.flagId)}
                      >
                        {t.flags.confirmDeleteBtn}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDeletingId(null)}
                      >
                        {t.flags.cancelBtn}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
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
