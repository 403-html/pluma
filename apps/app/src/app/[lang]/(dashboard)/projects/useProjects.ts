import { useState, useEffect, useCallback } from 'react';
import {
  listProjects,
  deleteProject,
  type ProjectSummary,
} from '@/lib/api/projects';

export type ProjectsModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; project: ProjectSummary };

export interface ProjectsState {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: string | null;
  modalState: ProjectsModalState;
  deletingId: string | null;
  loadProjects: () => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
  openAddModal: () => void;
  openEditModal: (project: ProjectSummary) => void;
  closeModal: () => void;
  handleModalSuccess: () => void;
  setDeletingId: (id: string | null) => void;
  setError: (error: string | null) => void;
}

export function useProjects(): ProjectsState {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ProjectsModalState>({ type: 'none' });
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
    void loadProjects();
  }, [loadProjects]);

  const handleDeleteProject = useCallback(
    async (id: string) => {
      const result = await deleteProject(id);
      setDeletingId(null);
      if (result.ok) {
        await loadProjects();
      } else {
        setError(result.message);
      }
    },
    [loadProjects],
  );

  const openAddModal = useCallback(() => {
    setError(null);
    setModalState({ type: 'add' });
  }, []);

  const openEditModal = useCallback((project: ProjectSummary) => {
    setError(null);
    setModalState({ type: 'edit', project });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ type: 'none' });
  }, []);

  const handleModalSuccess = useCallback(() => {
    setModalState({ type: 'none' });
    void loadProjects();
  }, [loadProjects]);

  return {
    projects,
    isLoading,
    error,
    modalState,
    deletingId,
    loadProjects,
    handleDeleteProject,
    openAddModal,
    openEditModal,
    closeModal,
    handleModalSuccess,
    setDeletingId,
    setError,
  };
}
