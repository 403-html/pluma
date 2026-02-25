'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type SdkToken } from '@/lib/api/tokens';
import { formatDate } from '@/lib/dateUtils';

const MASK_BULLETS = '••••••••';

function maskToken(tokenPrefix: string): string {
  return `${tokenPrefix}${MASK_BULLETS}`;
}

interface TokenTableLabels {
  colName: string;
  colProject: string;
  colEnvironment: string;
  colKey: string;
  colCreated: string;
  colActions: string;
  revokeBtn: string;
  confirmRevoke: string;
  confirmRevokeBtn: string;
  cancelBtn: string;
}

interface TokenTableProps {
  tokens: SdkToken[];
  locale: string;
  labels: TokenTableLabels;
  pendingRevokeId: string | null;
  isRevoking: boolean;
  onRevoke: (id: string) => void;
  onConfirmRevoke: (id: string) => void;
  onCancelRevoke: () => void;
}

export default function TokenTable({
  tokens,
  locale,
  labels,
  pendingRevokeId,
  isRevoking,
  onRevoke,
  onConfirmRevoke,
  onCancelRevoke,
}: TokenTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{labels.colName}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{labels.colProject}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{labels.colEnvironment}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{labels.colKey}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{labels.colCreated}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{labels.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr
              key={token.id}
              className="transition-colors hover:bg-muted/40 border-b border-border/20 last:border-b-0"
            >
              <td className="px-4 py-3 align-middle font-medium">{token.name}</td>
              <td className="px-4 py-3 align-middle text-muted-foreground">{token.projectName}</td>
              <td className="px-4 py-3 align-middle text-muted-foreground">{token.envName ?? '—'}</td>
              <td className="px-4 py-3 align-middle">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                  {maskToken(token.tokenPrefix)}
                </span>
              </td>
              <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                {formatDate(token.createdAt, locale)}
              </td>
              <td className="px-4 py-3 align-middle">
                {pendingRevokeId === token.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{labels.confirmRevoke}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onConfirmRevoke(token.id)}
                      disabled={isRevoking}
                    >
                      {labels.confirmRevokeBtn}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancelRevoke}
                      disabled={isRevoking}
                    >
                      {labels.cancelBtn}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRevoke(token.id)}
                    className="flex items-center gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10"
                    aria-label={`${labels.revokeBtn} ${token.name}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    {labels.revokeBtn}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
