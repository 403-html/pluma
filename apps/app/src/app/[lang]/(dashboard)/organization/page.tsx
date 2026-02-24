'use client';

import { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleContext';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import TokenRevealBanner from '@/components/TokenRevealBanner';
import { useOrgTokens } from './_components/useOrgTokens';
import CreateTokenModal from './_components/CreateTokenModal';
import TokenTable from './_components/TokenTable';
import type { CreatedToken } from '@/lib/api/tokens';

function LoadingSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3" aria-label="Loading API keys">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 bg-muted rounded-md" />
      ))}
    </div>
  );
}

export default function OrganizationPage() {
  const { t, locale } = useLocale();
  const org = t.organization;

  const {
    tokens, isLoadingTokens, loadError,
    createdToken, createdProjectName,
    pendingRevokeId, revokeError, isRevoking,
    fetchTokens, setCreatedToken, setCreatedProjectName,
    setPendingRevokeId, handleRevoke,
  } = useOrgTokens(org.revokeError);

  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleCreated(token: CreatedToken, projectName: string) {
    setCreatedToken(token);
    setCreatedProjectName(projectName);
    setIsModalOpen(false);
    void fetchTokens();
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-8">{org.title}</h1>

      <section className="mb-8 last:mb-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold">{org.apiKeysSection}</h2>
            <p className="text-sm text-muted-foreground mt-1">{org.apiKeysSectionDesc}</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} disabled={isLoadingTokens} className="flex items-center gap-2">
            <Plus size={16} aria-hidden="true" />
            {org.newApiKey}
          </Button>
        </div>

        {revokeError && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle size={15} aria-hidden="true" />
            {revokeError}
          </div>
        )}

        {createdToken && (
          <TokenRevealBanner
            token={createdToken}
            projectName={createdProjectName}
            onDismiss={() => setCreatedToken(null)}
            dismissLabel={org.dismiss}
            title={org.tokenRevealTitle}
            desc={org.tokenRevealDesc}
            keyLabel={org.tokenRevealKeyLabel}
          />
        )}

        {isLoadingTokens ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
            <AlertCircle size={15} aria-hidden="true" />
            {loadError}
          </div>
        ) : tokens.length === 0 ? (
          <EmptyState message={org.emptyState} />
        ) : (
          <TokenTable
            tokens={tokens}
            locale={locale}
            labels={org}
            pendingRevokeId={pendingRevokeId}
            isRevoking={isRevoking}
            onRevoke={(id) => { setPendingRevokeId(id); }}
            onConfirmRevoke={handleRevoke}
            onCancelRevoke={() => setPendingRevokeId(null)}
          />
        )}
      </section>

      {isModalOpen && (
        <CreateTokenModal
          labels={org}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </main>
  );
}

