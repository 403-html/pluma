'use client';

import { useLocale } from '@/i18n/LocaleContext';
import type { AuditLogEntry, AuditAction } from '@pluma/types';
import type { AuditPage as AuditPageData } from '@/lib/api/audit';
import { useAuditFilters, type AuditFilterState } from './useAuditFilters';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/dateUtils';

// ── Helpers ─────────────────────────────────────────────────────────────────

const ACTION_BADGE_CLASSES: Record<AuditAction, string> = {
  // Creation-like / enabling actions → secondary-style badge
  create: 'bg-secondary text-secondary-foreground',
  enable: 'bg-secondary text-secondary-foreground',
  // Non-destructive updates / toggles → muted-style badge
  update: 'bg-muted text-foreground',
  disable: 'bg-muted text-muted-foreground',
  // Destructive actions → destructive-style badge
  delete: 'bg-destructive text-destructive-foreground',
};

function getActionBadgeClass(action: AuditAction): string {
  return ACTION_BADGE_CLASSES[action] ?? 'bg-muted text-muted-foreground';
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
    <tr className="transition-colors hover:bg-muted/40">
      <td className="px-3 py-3 border-b border-border/20 align-middle text-sm text-muted-foreground whitespace-nowrap">
        {formatDateTime(entry.createdAt, locale)}
      </td>
      <td className="px-3 py-3 border-b border-border/20 align-middle text-sm">
        {entry.actorEmail}
      </td>
      <td className="px-3 py-3 border-b border-border/20 align-middle">
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getActionBadgeClass(entry.action)}`}>
          {entry.action}
        </span>
      </td>
      <td className="px-3 py-3 border-b border-border/20 align-middle text-sm">
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground inline-block">
          {entityDisplay}
        </span>
      </td>
      <td className="px-3 py-3 border-b border-border/20 align-middle text-xs text-muted-foreground max-w-xs truncate">
        {formatDetails(entry.details)}
      </td>
    </tr>
  );
}

const SELECT_CLASS = "text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring";

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allLabel: string;
  options: { id: string; name: string }[];
}

function FilterSelect({ id, label, value, onChange, disabled, allLabel, options }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select id={id} className={SELECT_CLASS} value={value}
        onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
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
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <FilterSelect id="project-filter" label={labels.filterProject} allLabel={labels.allProjects}
        value={selectedProjectId} onChange={handleProjectChange} options={projects} />
      <FilterSelect id="env-filter" label={labels.filterEnvironment} allLabel={labels.allEnvironments}
        value={selectedEnvId} onChange={handleEnvChange} disabled={!selectedProjectId} options={environments} />
      <FilterSelect id="flag-filter" label={labels.filterFlag} allLabel={labels.allFlags}
        value={selectedFlagId} onChange={handleFlagChange} disabled={!selectedProjectId} options={flags} />
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
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{headers.timestamp}</th>
          <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{headers.actor}</th>
          <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{headers.action}</th>
          <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{headers.entity}</th>
          <th className="text-left text-xs font-semibold uppercase text-muted-foreground px-3 py-2 border-b-2 border-border/40">{headers.details}</th>
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
    <div className="flex items-center gap-3 mt-4">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev}>
        {prevLabel}
      </Button>
      <span className="text-sm text-muted-foreground">{pageInfoTemplate.replace('{page}', String(currentPage))}</span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
        {nextLabel}
      </Button>
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
      <main className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold">{t.audit.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && !auditData) {
    return (
      <main className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold">{t.audit.title}</h1>
        </div>
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold">{t.audit.title}</h1>
      </div>

      <AuditFiltersBar state={state} labels={{
        filterProject: t.audit.filterProject,
        allProjects: t.audit.allProjects,
        filterEnvironment: t.audit.filterEnvironment,
        allEnvironments: t.audit.allEnvironments,
        filterFlag: t.audit.filterFlag,
        allFlags: t.audit.allFlags,
      }} />

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {auditData && auditData.entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{t.audit.emptyState}</div>
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

