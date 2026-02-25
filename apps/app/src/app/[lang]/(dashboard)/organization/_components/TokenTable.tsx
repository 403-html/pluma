'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableHeadRow } from '@/components/ui/table';
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
    <Table>
      <TableHeader>
        <TableHeadRow>
          <TableHead>{labels.colName}</TableHead>
          <TableHead>{labels.colProject}</TableHead>
          <TableHead>{labels.colEnvironment}</TableHead>
          <TableHead>{labels.colKey}</TableHead>
          <TableHead>{labels.colCreated}</TableHead>
          <TableHead>{labels.colActions}</TableHead>
        </TableHeadRow>
      </TableHeader>
      <TableBody>
        {tokens.map((token) => (
          <TableRow key={token.id}>
            <TableCell className="font-medium">{token.name}</TableCell>
            <TableCell className="text-muted-foreground">{token.projectName}</TableCell>
            <TableCell className="text-muted-foreground">{token.envName ?? '—'}</TableCell>
            <TableCell>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                {maskToken(token.tokenPrefix)}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {formatDate(token.createdAt, locale)}
            </TableCell>
            <TableCell>
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
