'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Project, Environment } from '@pluma/types';
import { projects, environments } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';

type TopBarProps = {
  onCreateFlag?: () => void;
};

export default function TopBar({ onCreateFlag }: TopBarProps) {
  const {
    selectedProject,
    selectedEnvironment,
    searchQuery,
    setSelectedProject,
    setSelectedEnvironment,
    setSearchQuery,
  } = useAppContext();

  const [projectList, setProjectList] = useState<Project[]>([]);
  const [envList, setEnvList] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchQuery);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projects.list();
      setProjectList(data);
      if (data.length > 0) {
        setSelectedProject((current) => current || data[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [setSelectedProject]);

  const loadEnvironments = useCallback(async (projectId: string) => {
    if (!projectId) return;
    try {
      const data = await environments.list(projectId);
      const list = Array.isArray(data) ? data : [];
      setEnvList(list);
      setSelectedEnvironment((current) => {
        const currentStillExists = list.some((env) => env.id === current?.id);
        return currentStillExists ? current : list[0] || null;
      });
    } catch {
      setEnvList([]);
      setSelectedEnvironment(null);
    }
  }, [setSelectedEnvironment]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProject) {
      loadEnvironments(selectedProject.id);
    } else {
      setEnvList([]);
      setSelectedEnvironment(null);
    }
  }, [selectedProject, loadEnvironments, setSelectedEnvironment]);

  const debounceRef = useRef<number | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [setSearchQuery],
  );

  if (loading) {
    return (
      <div className="flex items-center px-5 py-3 bg-card border-b border-stroke gap-6">
        <div className="text-ink-muted text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-stroke gap-6">
      <div className="flex gap-4 flex-1 items-end">
        <label className="flex flex-col gap-1 min-w-[160px]">
          <span className="text-label text-ink-dim font-medium uppercase tracking-wider">Project</span>
          <select
            className="px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] focus-visible:border-accent"
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const proj = projectList.find((p) => p.id === e.target.value);
              setSelectedProject(proj || null);
            }}
          >
            {projectList.length === 0 && (
              <option value="">No projects</option>
            )}
            {projectList.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 min-w-[160px]">
          <span className="text-label text-ink-dim font-medium uppercase tracking-wider">Environment</span>
          <select
            className="px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] focus-visible:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedEnvironment?.id || ''}
            onChange={(e) => {
              const env = envList.find((env) => env.id === e.target.value);
              setSelectedEnvironment(env || null);
            }}
            disabled={!selectedProject}
          >
            {envList.length === 0 && <option value="">No environments</option>}
            {envList.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 min-w-[200px]">
          <span className="text-label text-ink-dim font-medium uppercase tracking-wider">Search</span>
          <input
            type="search"
            className="px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] focus-visible:border-accent"
            placeholder="Filter flags..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              handleSearchChange(e.target.value);
            }}
          />
        </label>
      </div>

      {onCreateFlag && (
        <button
          className="px-4 py-1.5 bg-accent text-surface border-none text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          onClick={onCreateFlag}
          type="button"
        >
          Create Flag
        </button>
      )}
    </div>
  );
}
