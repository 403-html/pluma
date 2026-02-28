import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  listFlagsForEnvironment,
  deleteFlag,
  toggleFlagEnabled,
  type FlagEntry,
} from '@/lib/api/flags';
import { toastErrorRender } from '@/lib/toastUtils';
import { getProject } from '@/lib/api/projects';
import { listEnvironments } from '@/lib/api/environments';
import { useLocale } from '@/i18n/LocaleContext';

export type FlagsModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'addSub'; parentFlag: { flagId: string; name: string; key: string } }
  | { type: 'edit'; flag: FlagEntry };

export interface FlagsState {
  flags: FlagEntry[];
  isLoading: boolean;
  error: string | null;
  modalState: FlagsModalState;
  deletingId: string | null;
  togglingIds: Set<string>;
  projectName: string | null;
  envName: string | null;
  loadFlags: () => Promise<void>;
  handleToggleFlag: (flagId: string, currentEnabled: boolean) => Promise<void>;
  handleDeleteFlag: (id: string) => Promise<void>;
  handleAddFlag: () => void;
  handleEditFlag: (flag: FlagEntry) => void;
  openAddSubModal: (parentFlag: { flagId: string; name: string; key: string }) => void;
  cancelDelete: () => void;
  closeModal: () => void;
  handleModalSuccess: () => void;
  setDeletingId: (id: string | null) => void;
  setError: (error: string | null) => void;
}

export function useFlags(envId: string, projectId: string): FlagsState {
  const { t } = useLocale();

  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [envName, setEnvName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<FlagsModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

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
      const env = envsResult.environments.find((e) => e.id === envId);
      if (env) setEnvName(env.name);
    }
    setIsLoading(false);
  }, [envId, projectId]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  // Toggle uses simple toast.error/success (not toast.promise) because the
  // optimistic state update must be applied and potentially reverted synchronously
  // around the async call — wrapping in toast.promise would complicate that flow.
  const handleToggleFlag = useCallback(
    async (flagId: string, currentEnabled: boolean) => {
      setTogglingIds((prev) => new Set(prev).add(flagId));
      setFlags((prev) =>
        prev.map((f) => (f.flagId === flagId ? { ...f, enabled: !currentEnabled } : f)),
      );
      const result = await toggleFlagEnabled(envId, flagId, !currentEnabled);
      if (!result.ok) {
        setFlags((prev) =>
          prev.map((f) => (f.flagId === flagId ? { ...f, enabled: currentEnabled } : f)),
        );
        setError(t.flags.toggleError);
        toast.error(t.flags.toggleError);
      } else {
        toast.success(t.flags.toastToggleSuccess);
      }
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(flagId);
        return next;
      });
    },
    [envId, t.flags],
  );

  const handleDeleteFlag = useCallback(
    async (id: string) => {
      const toastPromise = deleteFlag(id).then((result) => {
        if (!result.ok) throw new Error(result.message ?? t.flags.deleteError);
      });
      await toast.promise(toastPromise, {
        pending: t.flags.toastDeletePending,
        success: t.flags.toastDeleteSuccess,
        error: { render: toastErrorRender },
      });
      setDeletingId(null);
      await loadFlags();
    },
    [loadFlags, t.flags],
  );

  const handleAddFlag = useCallback(() => {
    setError(null);
    setModalState({ type: 'add' });
  }, []);

  const handleEditFlag = useCallback((flag: FlagEntry) => {
    setError(null);
    setModalState({ type: 'edit', flag });
  }, []);

  const openAddSubModal = useCallback(
    (parentFlag: { flagId: string; name: string; key: string }) => {
      setError(null);
      setModalState({ type: 'addSub', parentFlag });
    },
    [],
  );

  const cancelDelete = useCallback(() => {
    setDeletingId(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ type: 'none' });
  }, []);

  const handleModalSuccess = useCallback(() => {
    const msg = modalState.type === 'edit' ? t.flags.toastEditSuccess : t.flags.toastCreateSuccess;
    toast.success(msg);
    setModalState({ type: 'none' });
    void loadFlags();
  }, [loadFlags, modalState.type, t.flags]);

  return {
    flags,
    isLoading,
    error,
    modalState,
    deletingId,
    togglingIds,
    projectName,
    envName,
    loadFlags,
    handleToggleFlag,
    handleDeleteFlag,
    handleAddFlag,
    handleEditFlag,
    openAddSubModal,
    cancelDelete,
    closeModal,
    handleModalSuccess,
    setDeletingId,
    setError,
  };
}
