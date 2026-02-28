'use client';

import { useLocale } from '@/i18n/LocaleContext';
import type { AuditLogEntry } from '@pluma/types';
import type { ProjectSummary } from '@pluma/types';
import type { AuditPage as AuditPageData } from '@/lib/api/audit';
import { useAuditFilters, type AuditFilterState } from './useAuditFilters';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableHeadRow, TablePagination } from '@/components/ui/table';
import { formatDateTime } from '@/lib/dateUtils';
import EmptyState from '@/components/EmptyState';
import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { AuditActionBadge } from './AuditActionBadge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    <TableRow>
      <TableCell className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatDateTime(entry.createdAt, locale)}
      </TableCell>
      <TableCell className="px-3 py-3 text-sm">
        {entry.actorEmail}
      </TableCell>
      <TableCell className="px-3 py-3">
        <AuditActionBadge action={entry.action} />
      </TableCell>
      <TableCell className="px-3 py-3 text-sm">
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground inline-block">
          {entityDisplay}
        </span>
      </TableCell>
      <TableCell className="px-3 py-3 text-xs text-muted-foreground max-w-xs truncate">
        {formatDetails(entry.details)}
      </TableCell>
    </TableRow>
  );
}

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
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{allLabel}</SelectItem>
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
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
    <div className="flex flex-wrap items-end gap-4">
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
    <Table>
      <TableHeader>
        <TableHeadRow>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{headers.timestamp}</TableHead>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{headers.actor}</TableHead>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{headers.action}</TableHead>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{headers.entity}</TableHead>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{headers.details}</TableHead>
        </TableHeadRow>
      </TableHeader>
      <TableBody>
        {auditData.entries.map((entry) => (
          <AuditTableRow key={entry.id} entry={entry} locale={locale} />
        ))}
      </TableBody>
    </Table>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Optional props for `AuditPage`.
 *
 * These props are intended for Storybook stories and testing only.
 * When provided they seed the page with static data and disable all
 * API fetches — do not use them in production routes.
 */
export interface AuditPageProps {
  initialAuditData?: AuditPageData;
  initialProjects?: ProjectSummary[];
}

export default function AuditPage({ initialAuditData, initialProjects }: AuditPageProps = {}) {
  const { t, locale } = useLocale();
  const state = useAuditFilters({ initialAuditData, initialProjects });
  const { auditData, isLoading, error, currentPage, handlePrevPage, handleNextPage } = state;

  const hasNextPage = auditData != null && currentPage * auditData.pageSize < auditData.total;
  const hasPrevPage = currentPage > 1;

  if (isLoading && !auditData) {
    return (
      <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader title={t.audit.title} />
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && !auditData) {
    return (
      <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
        <PageHeader title={t.audit.title} />
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
      <PageHeader 
        title={t.audit.title}
        actions={
          <AuditFiltersBar state={state} labels={{
            filterProject: t.audit.filterProject,
            allProjects: t.audit.allProjects,
            filterEnvironment: t.audit.filterEnvironment,
            allEnvironments: t.audit.allEnvironments,
            filterFlag: t.audit.filterFlag,
            allFlags: t.audit.allFlags,
          }} />
        }
      />

      {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-4">{error}</div>}

      {auditData && auditData.entries.length === 0 ? (
        <EmptyState message={t.audit.emptyState} icon={ScrollText} />
      ) : auditData ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <AuditTable auditData={auditData} locale={locale} headers={{
            timestamp: t.audit.colTimestamp,
            actor: t.audit.colActor,
            action: t.audit.colAction,
            entity: t.audit.colEntity,
            details: t.audit.colDetails,
          }} />
          {(hasPrevPage || hasNextPage) && (
            <TablePagination
              currentPage={currentPage}
              hasPrev={hasPrevPage}
              hasNext={hasNextPage}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              prevLabel={t.common.prevPage}
              nextLabel={t.common.nextPage}
              pageInfoTemplate={t.common.pageInfo}
              className="shrink-0"
            />
          )}
        </div>
      ) : null}
    </main>
  );
}

