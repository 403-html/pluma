'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { listAuditLog, type AuditFilters, type AuditPage as AuditPageData } from '@/lib/api/audit';
import type { ProjectSummary } from '@pluma/types';

export interface Flag {
  id: string;
  key: string;
  name: string;
}

export interface Environment {
  id: string;
  key: string;
  name: string;
}

export interface AuditFilterState {
  projects: ProjectSummary[];
  flags: Flag[];
  environments: Environment[];
  selectedProjectId: string;
  selectedEnvId: string;
  selectedFlagId: string;
  currentPage: number;
  auditData: AuditPageData | null;
  isLoading: boolean;
  error: string | null;
  handleProjectChange: (projectId: string) => void;
  handleEnvChange: (envId: string) => void;
  handleFlagChange: (flagId: string) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
}

/**
 * Options for `useAuditFilters`.
 *
 * Pass `initialAuditData` and/or `initialProjects` to seed the hook with
 * static data (e.g. Storybook stories). When either value is provided the
 * corresponding API fetch is skipped entirely for the lifetime of the hook
 * instance — use this only in contexts where live data loading is not needed.
 */
export interface UseAuditFiltersOptions {
  initialAuditData?: AuditPageData;
  initialProjects?: ProjectSummary[];
}

export function useAuditFilters(options: UseAuditFiltersOptions = {}): AuditFilterState {
  // Capture initial values in refs so callbacks don't depend on the options object
  const skipAuditLoadRef = useRef(options.initialAuditData !== undefined);
  const skipProjectsLoadRef = useRef(options.initialProjects !== undefined);

  const [auditData, setAuditData] = useState<AuditPageData | null>(options.initialAuditData ?? null);
  const [isLoading, setIsLoading] = useState(!skipAuditLoadRef.current);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectSummary[]>(options.initialProjects ?? []);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [selectedFlagId, setSelectedFlagId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadProjects = useCallback(async () => {
    if (skipProjectsLoadRef.current) return;
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data: ProjectSummary[] = await response.json();
        setProjects(data);
      }
    } catch {
      // Silently fail — projects are optional for audit filtering
    }
  }, []);

  const loadFlags = useCallback(async (projectId: string) => {
    if (!projectId) {
      setFlags([]);
      return;
    }
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/flags`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data: Flag[] = await response.json();
        if (Array.isArray(data)) {
          setFlags(data);
        } else {
          setFlags([]);
        }
      } else {
        setFlags([]);
      }
    } catch {
      setFlags([]);
    }
  }, []);

  const loadAuditEntries = useCallback(async () => {
    if (skipAuditLoadRef.current) return;
    setIsLoading(true);
    setError(null);
    const filters: AuditFilters = { page: currentPage };
    if (selectedProjectId) filters.projectId = selectedProjectId;
    if (selectedEnvId) filters.envId = selectedEnvId;
    if (selectedFlagId) filters.flagId = selectedFlagId;

    const result = await listAuditLog(filters);
    if (result.ok) {
      setAuditData(result.data);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, [currentPage, selectedProjectId, selectedEnvId, selectedFlagId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadAuditEntries();
  }, [loadAuditEntries]);

  useEffect(() => {
    if (selectedProjectId) {
      loadFlags(selectedProjectId);
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        setEnvironments(project.environments);
      }
    } else {
      setFlags([]);
      setEnvironments([]);
    }
    setSelectedEnvId('');
    setSelectedFlagId('');
  }, [selectedProjectId, projects, loadFlags]);

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    setCurrentPage(1);
  }

  function handleEnvChange(envId: string) {
    setSelectedEnvId(envId);
    setCurrentPage(1);
  }

  function handleFlagChange(flagId: string) {
    setSelectedFlagId(flagId);
    setCurrentPage(1);
  }

  function handlePrevPage() {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }

  function handleNextPage() {
    if (auditData && currentPage * auditData.pageSize < auditData.total) {
      setCurrentPage(currentPage + 1);
    }
  }

  return {
    projects,
    flags,
    environments,
    selectedProjectId,
    selectedEnvId,
    selectedFlagId,
    currentPage,
    auditData,
    isLoading,
    error,
    handleProjectChange,
    handleEnvChange,
    handleFlagChange,
    handlePrevPage,
    handleNextPage,
  };
}
