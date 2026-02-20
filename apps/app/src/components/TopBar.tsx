'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, Environment } from '@pluma/types';
import { projects, environments } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';
import styles from './TopBar.module.css';

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

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadEnvironments(selectedProject.id);
    } else {
      setEnvList([]);
      setSelectedEnvironment(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projects.list();
      setProjectList(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEnvironments = async (projectId: string) => {
    try {
      const data = await environments.list(projectId);
      setEnvList(data);
      if (data.length > 0 && !selectedEnvironment) {
        setSelectedEnvironment(data[0]);
      } else if (!data.some((e) => e.id === selectedEnvironment?.id)) {
        setSelectedEnvironment(data[0] || null);
      }
    } catch {
      setEnvList([]);
      setSelectedEnvironment(null);
    }
  };

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
    },
    [setSearchQuery],
  );

  if (loading) {
    return (
      <div className={styles.topBar}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.topBar}>
      <div className={styles.selectors}>
        <label className={styles.selectLabel}>
          <span className={styles.labelText}>Project</span>
          <select
            className={styles.select}
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

        <label className={styles.selectLabel}>
          <span className={styles.labelText}>Environment</span>
          <select
            className={styles.select}
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

        <label className={styles.searchLabel}>
          <span className={styles.labelText}>Search</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Filter flags..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </label>
      </div>

      {onCreateFlag && (
        <button
          className={styles.createButton}
          onClick={onCreateFlag}
          type="button"
        >
          Create Flag
        </button>
      )}
    </div>
  );
}
