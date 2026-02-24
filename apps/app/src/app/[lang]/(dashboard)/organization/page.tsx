'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, AlertCircle, Key } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Modal from '@/components/Modal';
import { CopyPill } from '@/components/CopyPill';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SdkToken {
  id: string;
  name: string;
  tokenPrefix: string;
  projectId: string;
  projectName: string;
  envId: string | null;
  createdAt: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  key: string;
}

interface CreatedToken {
  id: string;
  name: string;
  tokenPrefix: string;
  token: string;
  projectId: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

function maskToken(tokenPrefix: string): string {
  return `${tokenPrefix}••••••••`;
}

const SELECT_CLASS =
  'text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring w-full';

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3" aria-label="Loading API keys">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 bg-muted rounded-md" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Key size={36} aria-hidden="true" className="opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface TokenRevealBannerProps {
  token: CreatedToken;
  projectName: string;
  onDismiss: () => void;
  dismissLabel: string;
  title: string;
  desc: string;
}

function TokenRevealBanner({ token, projectName, onDismiss, dismissLabel, title, desc }: TokenRevealBannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40 p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">{title}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">{desc}</p>
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950/60 px-3 py-2">
            <CopyPill value={token.token} variant="inline" />
          </div>
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-500">
            {token.name} · {projectName}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs text-emerald-700 dark:text-emerald-400 underline hover:no-underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={dismissLabel}
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const { t, locale } = useLocale();
  const org = t.organization;

  // Token list state
  const [tokens, setTokens] = useState<SdkToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reveal banner (shown once after creation)
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [createdProjectName, setCreatedProjectName] = useState('');

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete/revoke state: id of token pending confirmation
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/v1/tokens', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        const msg = await parseErrorMessage(response, org.loadingError);
        setLoadError(msg);
        return;
      }
      const data: SdkToken[] = await response.json();
      setTokens(data);
    } catch {
      setLoadError(org.loadingError);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [org.loadingError]);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  // ── Modal open: load projects ───────────────────────────────────────────────

  async function handleOpenModal() {
    setIsModalOpen(true);
    setNewKeyName('');
    setSelectedProjectId('');
    setCreateError(null);
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        const msg = await parseErrorMessage(response, org.loadingError);
        setCreateError(msg);
        setIsLoadingProjects(false);
        return;
      }
      const data: ProjectSummary[] = await response.json();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch {
      setCreateError(org.loadingError);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  function handleCloseModal() {
    if (isCreating) return;
    setIsModalOpen(false);
    setCreateError(null);
  }

  // ── Create token ────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!newKeyName.trim()) {
      setCreateError(org.nameRequired);
      return;
    }
    if (!selectedProjectId) {
      setCreateError(org.projectRequired);
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), projectId: selectedProjectId }),
        credentials: 'include',
      });
      if (!response.ok) {
        const msg = await parseErrorMessage(response, org.createError);
        setCreateError(msg);
        return;
      }
      const data: CreatedToken = await response.json();

      // Store the raw token for one-time display
      setCreatedToken(data);
      const project = projects.find((p) => p.id === selectedProjectId);
      setCreatedProjectName(project?.name ?? '');

      // Close modal and refresh list
      setIsModalOpen(false);
      void fetchTokens();
    } catch {
      setCreateError(org.createError);
    } finally {
      setIsCreating(false);
    }
  }

  // ── Revoke token ────────────────────────────────────────────────────────────

  async function handleRevoke(id: string) {
    setIsRevoking(true);
    setRevokeError(null);
    try {
      const response = await fetch(`/api/v1/tokens/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const msg = await parseErrorMessage(response, org.revokeError);
        setRevokeError(msg);
        setPendingRevokeId(null);
        return;
      }
      // Optimistically remove from list
      setTokens((prev) => prev.filter((tk) => tk.id !== id));
      setPendingRevokeId(null);
      // Also clear the reveal banner if it matches the revoked token
      if (createdToken?.id === id) {
        setCreatedToken(null);
      }
    } catch {
      setRevokeError(org.revokeError);
      setPendingRevokeId(null);
    } finally {
      setIsRevoking(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-8">{org.title}</h1>

      <section className="mb-8 last:mb-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold">{org.apiKeysSection}</h2>
            <p className="text-sm text-muted-foreground mt-1">{org.apiKeysSectionDesc}</p>
          </div>
          <Button
            onClick={handleOpenModal}
            disabled={isLoadingTokens}
            className="flex items-center gap-2"
          >
            <Plus size={16} aria-hidden="true" />
            {org.newApiKey}
          </Button>
        </div>

        {/* Revoke error banner */}
        {revokeError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle size={15} aria-hidden="true" />
            {revokeError}
          </div>
        )}

        {/* Token reveal banner (shown once after creation) */}
        {createdToken && (
          <TokenRevealBanner
            token={createdToken}
            projectName={createdProjectName}
            onDismiss={() => setCreatedToken(null)}
            dismissLabel={org.dismiss}
            title={org.tokenRevealTitle}
            desc={org.tokenRevealDesc}
          />
        )}

        {/* Token table */}
        {isLoadingTokens ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
          >
            <AlertCircle size={15} aria-hidden="true" />
            {loadError}
          </div>
        ) : tokens.length === 0 ? (
          <EmptyState message={org.emptyState} />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{org.colName}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{org.colProject}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{org.colKey}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{org.colCreated}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{org.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="transition-colors hover:bg-muted/40 border-b border-border/20 last:border-b-0">
                    <td className="px-4 py-3 align-middle font-medium">{token.name}</td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{token.projectName}</td>
                    <td className="px-4 py-3 align-middle">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                        {maskToken(token.tokenPrefix)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                      {new Date(token.createdAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {pendingRevokeId === token.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{org.confirmRevoke}</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevoke(token.id)}
                            disabled={isRevoking}
                          >
                            {org.confirmRevokeBtn}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingRevokeId(null)}
                            disabled={isRevoking}
                          >
                            {org.cancelBtn}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRevokeError(null);
                            setPendingRevokeId(token.id);
                          }}
                          className="flex items-center gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10"
                          aria-label={`${org.revokeBtn} ${token.name}`}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          {org.revokeBtn}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create API Key Modal */}
      {isModalOpen && (
        <Modal
          titleId="create-api-key-modal"
          title={org.createModalTitle}
          onClose={handleCloseModal}
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="api-key-name" className="text-sm font-medium">
                {org.nameLabel}
              </label>
              <Input
                id="api-key-name"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={org.namePlaceholder}
                required
                disabled={isCreating}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="api-key-project" className="text-sm font-medium">
                {org.projectLabel}
              </label>
              {isLoadingProjects ? (
                <p className="text-sm text-muted-foreground">{org.loadingProjects}</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">{org.noProjects}</p>
              ) : (
                <select
                  id="api-key-project"
                  className={SELECT_CLASS}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                  disabled={isCreating}
                >
                  <option value="" disabled>
                    {org.projectPlaceholder}
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {createError && (
              <div
                role="alert"
                className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
              >
                <AlertCircle size={14} aria-hidden="true" />
                {createError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isCreating}
              >
                {org.cancelBtn}
              </Button>
              <Button type="submit" disabled={isCreating || isLoadingProjects || projects.length === 0}>
                {isCreating ? org.createLoading : org.createBtn}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
