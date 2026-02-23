'use client';

import { useLocale } from '@/i18n/LocaleContext';
import type { AuditLogEntry, AuditAction } from '@pluma/types';
import type { AuditPage as AuditPageData } from '@/lib/api/audit';
import { useAuditFilters, type AuditFilterState } from './useAuditFilters';

// ── Helpers ─────────────────────────────────────────────────────────────────

function getActionBadgeStyle(action: AuditAction): string {
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

function formatDetails(details: unknown): string {
  if (details === null || details === undefined) return '—';
  if (typeof details === 'object' && Object.keys(details as object).length === 0) return '—';
  return JSON.stringify(details);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AuditTableRow({ entry, locale }: { entry: AuditLogEntry; locale: string }) {
  const entityDisplay = entry.entityKey
    ? `${entry.entityType}: ${entry.entityKey}`
    : entry.entityType;

  return (
    <tr>
      <td><span className="audit-timestamp">{new Date(entry.createdAt).toLocaleString(locale)}</span></td>
      <td><span className="audit-actor">{entry.actorEmail}</span></td>
      <td><span className={getActionBadgeStyle(entry.action)}>{entry.action}</span></td>
      <td><span className="audit-entity">{entityDisplay}</span></td>
      <td><span className="audit-details">{formatDetails(entry.details)}</span></td>
    </tr>
  );
}

interface AuditFiltersProps {
  state: AuditFilterState;
  labels: {
    filterProject: string;
    allProjects: string;
    filterEnvironment: string;
    allEnvironments: string;
    filterFlag: string;
    allFlags: string;
  };
}

function AuditFiltersBar({ state, labels }: AuditFiltersProps) {
  const { projects, environments, flags, selectedProjectId, selectedEnvId, selectedFlagId,
    handleProjectChange, handleEnvChange, handleFlagChange } = state;

  return (
    <div className="audit-filters">
      <div className="audit-filter">
        <label htmlFor="project-filter" className="audit-filter-label">{labels.filterProject}</label>
        <select id="project-filter" className="audit-filter-select" value={selectedProjectId}
          onChange={(e) => handleProjectChange(e.target.value)}>
          <option value="">{labels.allProjects}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="audit-filter">
        <label htmlFor="env-filter" className="audit-filter-label">{labels.filterEnvironment}</label>
        <select id="env-filter" className="audit-filter-select" value={selectedEnvId}
          onChange={(e) => handleEnvChange(e.target.value)} disabled={!selectedProjectId}>
          <option value="">{labels.allEnvironments}</option>
          {environments.map((env) => <option key={env.id} value={env.id}>{env.name}</option>)}
        </select>
      </div>
      <div className="audit-filter">
        <label htmlFor="flag-filter" className="audit-filter-label">{labels.filterFlag}</label>
        <select id="flag-filter" className="audit-filter-select" value={selectedFlagId}
          onChange={(e) => handleFlagChange(e.target.value)} disabled={!selectedProjectId}>
          <option value="">{labels.allFlags}</option>
          {flags.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
    </div>
  );
}

interface AuditTableProps {
  auditData: AuditPageData;
  locale: string;
  headers: { timestamp: string; actor: string; action: string; entity: string; details: string };
}

function AuditTable({ auditData, locale, headers }: AuditTableProps) {
  return (
    <table className="audit-table">
      <thead>
        <tr>
          <th>{headers.timestamp}</th>
          <th>{headers.actor}</th>
          <th>{headers.action}</th>
          <th>{headers.entity}</th>
          <th>{headers.details}</th>
        </tr>
      </thead>
      <tbody>
        {auditData.entries.map((entry) => (
          <AuditTableRow key={entry.id} entry={entry} locale={locale} />
        ))}
      </tbody>
    </table>
  );
}

interface AuditPaginationProps {
  currentPage: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  pageInfoTemplate: string;
}

function AuditPagination({ currentPage, hasPrev, hasNext, onPrev, onNext, prevLabel, nextLabel, pageInfoTemplate }: AuditPaginationProps) {
  return (
    <div className="audit-pagination">
      <button type="button" className="btn-sm" onClick={onPrev} disabled={!hasPrev}>
        {prevLabel}
      </button>
      <span className="audit-page-info">{pageInfoTemplate.replace('{page}', String(currentPage))}</span>
      <button type="button" className="btn-sm" onClick={onNext} disabled={!hasNext}>
        {nextLabel}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const { t, locale } = useLocale();
  const state = useAuditFilters();
  const { auditData, isLoading, error, currentPage, handlePrevPage, handleNextPage } = state;

  const hasNextPage = auditData != null && currentPage * auditData.pageSize < auditData.total;
  const hasPrevPage = currentPage > 1;

  if (isLoading && !auditData) {
    return (
      <main className="audit-page">
        <div className="audit-page-header"><h1 className="audit-page-title">{t.audit.title}</h1></div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && !auditData) {
    return (
      <main className="audit-page">
        <div className="audit-page-header"><h1 className="audit-page-title">{t.audit.title}</h1></div>
        <div className="form-error">{error}</div>
      </main>
    );
  }

  return (
    <main className="audit-page">
      <div className="audit-page-header">
        <h1 className="audit-page-title">{t.audit.title}</h1>
      </div>

      <AuditFiltersBar state={state} labels={{
        filterProject: t.audit.filterProject,
        allProjects: t.audit.allProjects,
        filterEnvironment: t.audit.filterEnvironment,
        allEnvironments: t.audit.allEnvironments,
        filterFlag: t.audit.filterFlag,
        allFlags: t.audit.allFlags,
      }} />

      {error && <div className="form-error audit-error">{error}</div>}

      {auditData && auditData.entries.length === 0 ? (
        <div className="audit-empty">{t.audit.emptyState}</div>
      ) : auditData ? (
        <>
          <AuditTable auditData={auditData} locale={locale} headers={{
            timestamp: t.audit.colTimestamp,
            actor: t.audit.colActor,
            action: t.audit.colAction,
            entity: t.audit.colEntity,
            details: t.audit.colDetails,
          }} />
          <AuditPagination
            currentPage={currentPage}
            hasPrev={hasPrevPage}
            hasNext={hasNextPage}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
            prevLabel={t.audit.prevPage}
            nextLabel={t.audit.nextPage}
            pageInfoTemplate={t.audit.pageInfo}
          />
        </>
      ) : null}
    </main>
  );
}

