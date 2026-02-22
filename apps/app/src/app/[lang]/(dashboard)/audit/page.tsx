'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { listAuditLog, type AuditFilters, type AuditPage as AuditPageData } from '@/lib/api/audit';
import type { AuditLogEntry, ProjectSummary } from '@pluma/types';

interface Flag {
  id: string;
  key: string;
  name: string;
}

interface Environment {
  id: string;
  key: string;
  name: string;
}

function getActionBadgeStyle(action: string): string {
  const baseClass = 'audit-action-badge';
  switch (action) {
    case 'create': return `${baseClass} ${baseClass}--create`;
    case 'update': return `${baseClass} ${baseClass}--update`;
    case 'delete': return `${baseClass} ${baseClass}--delete`;
    case 'enable': return `${baseClass} ${baseClass}--enable`;
    case 'disable': return `${baseClass} ${baseClass}--disable`;
    default: return baseClass;
  }
}

function formatDetails(details: Record<string, unknown> | null | undefined): string {
  if (!details || Object.keys(details).length === 0) return '—';
  // Use compact JSON format (no indentation) to fit in table cell
  return JSON.stringify(details, null, 0);
}

function AuditTableRow({ entry }: { entry: AuditLogEntry }) {
  const entityDisplay = entry.entityKey
    ? `${entry.entityType}: ${entry.entityKey}`
    : entry.entityType;

  return (
    <tr>
      <td>
        <span className="audit-timestamp">
          {new Date(entry.createdAt).toLocaleString()}
        </span>
      </td>
      <td>
        <span className="audit-actor">{entry.actorEmail}</span>
      </td>
      <td>
        <span className={getActionBadgeStyle(entry.action)}>
          {entry.action}
        </span>
      </td>
      <td>
        <span className="audit-entity">{entityDisplay}</span>
      </td>
      <td>
        <span className="audit-details">{formatDetails(entry.details)}</span>
      </td>
    </tr>
  );
}

export default function AuditPage() {
  const { t } = useLocale();
  const [auditData, setAuditData] = useState<AuditPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [selectedFlagId, setSelectedFlagId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadProjects = useCallback(async () => {
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
      // Silently fail - projects are optional for audit filtering
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
        setFlags(data);
      } else {
        setFlags([]);
      }
    } catch {
      setFlags([]);
    }
  }, []);

  const loadAuditEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const filters: AuditFilters = {
      page: currentPage,
    };
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

  if (isLoading && !auditData) {
    return (
      <main className="audit-page">
        <div className="audit-page-header">
          <h1 className="audit-page-title">{t.audit.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && !auditData) {
    return (
      <main className="audit-page">
        <div className="audit-page-header">
          <h1 className="audit-page-title">{t.audit.title}</h1>
        </div>
        <div className="form-error">{error}</div>
      </main>
    );
  }

  const hasNextPage = auditData && currentPage * auditData.pageSize < auditData.total;
  const hasPrevPage = currentPage > 1;

  return (
    <main className="audit-page">
      <div className="audit-page-header">
        <h1 className="audit-page-title">{t.audit.title}</h1>
      </div>

      <div className="audit-filters">
        <div className="audit-filter">
          <label htmlFor="project-filter" className="audit-filter-label">
            {t.audit.filterProject}
          </label>
          <select
            id="project-filter"
            className="audit-filter-select"
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="">{t.audit.allProjects}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="audit-filter">
          <label htmlFor="env-filter" className="audit-filter-label">
            {t.audit.filterEnvironment}
          </label>
          <select
            id="env-filter"
            className="audit-filter-select"
            value={selectedEnvId}
            onChange={(e) => handleEnvChange(e.target.value)}
            disabled={!selectedProjectId}
          >
            <option value="">{t.audit.allEnvironments}</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>

        <div className="audit-filter">
          <label htmlFor="flag-filter" className="audit-filter-label">
            {t.audit.filterFlag}
          </label>
          <select
            id="flag-filter"
            className="audit-filter-select"
            value={selectedFlagId}
            onChange={(e) => handleFlagChange(e.target.value)}
            disabled={!selectedProjectId}
          >
            <option value="">{t.audit.allFlags}</option>
            {flags.map((flag) => (
              <option key={flag.id} value={flag.id}>
                {flag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="form-error audit-error">{error}</div>}

      {auditData && auditData.entries.length === 0 ? (
        <div className="audit-empty">{t.audit.emptyState}</div>
      ) : (
        <>
          <table className="audit-table">
            <thead>
              <tr>
                <th>{t.audit.colTimestamp}</th>
                <th>{t.audit.colActor}</th>
                <th>{t.audit.colAction}</th>
                <th>{t.audit.colEntity}</th>
                <th>{t.audit.colDetails}</th>
              </tr>
            </thead>
            <tbody>
              {auditData?.entries.map((entry) => (
                <AuditTableRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>

          <div className="audit-pagination">
            <button
              type="button"
              className="btn-sm"
              onClick={handlePrevPage}
              disabled={!hasPrevPage}
            >
              {t.audit.prevPage}
            </button>
            <span className="audit-page-info">
              {t.audit.pageInfo.replace('{page}', String(currentPage))}
            </span>
            <button
              type="button"
              className="btn-sm"
              onClick={handleNextPage}
              disabled={!hasNextPage}
            >
              {t.audit.nextPage}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
