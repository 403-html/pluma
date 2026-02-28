'use client';

import React from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import type { FlagEntry } from '@/lib/api/flags';
import { Button } from '@/components/ui/button';
import { SwitchField } from '@/components/ui/switch';
import { TableRow, TableCell } from '@/components/ui/table';
import { CopyPill } from '@/components/CopyPill';
import { TruncatedText } from '@/components/TruncatedText';

interface FlagRowProps {
  flag: FlagEntry;
  depth: number;
  indentPx: number;
  isDeleting: boolean;
  isToggling: boolean;
  onToggle: (flagId: string, currentEnabled: boolean) => void;
  onDeleteStart: (flagId: string) => void;
  onDeleteCancel: () => void;
  onDelete: (flagId: string) => void;
  onEdit: (flag: FlagEntry) => void;
  onAddSub: (parentFlag: { flagId: string; name: string; key: string }) => void;
}

export const FlagRow = React.memo(function FlagRow({
  flag,
  depth,
  indentPx,
  isDeleting,
  isToggling,
  onToggle,
  onDeleteStart,
  onDeleteCancel,
  onDelete,
  onEdit,
  onAddSub,
}: FlagRowProps) {
  const { t } = useLocale();

  return (
    <TableRow className={depth > 0 ? 'bg-muted/20' : undefined}>
      <TableCell className="px-3 py-3">
        <span
          className="flex items-center gap-1.5"
          style={depth > 0 ? { paddingLeft: `${indentPx}px` } : undefined}
        >
          {depth > 0 && (
            <span className="text-muted-foreground/60 text-xs leading-none">{t.flags.subFlagIndicator}</span>
          )}
          <span className={depth > 0 ? 'text-sm text-muted-foreground' : undefined}>{flag.name}</span>
        </span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <CopyPill value={flag.key} />
      </TableCell>
      <TableCell className="px-3 py-3 max-w-[240px]">
        {flag.description ? (
          <TruncatedText
            text={flag.description}
            showMoreLabel={t.common.showMore}
            showLessLabel={t.common.showLess}
          />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="px-3 py-3">
        <SwitchField
          size="sm"
          checked={flag.enabled}
          disabled={isToggling}
          onCheckedChange={() => onToggle(flag.flagId, flag.enabled)}
          label={flag.enabled ? t.flags.enabledLabel : t.flags.disabledLabel}
          aria-label={`${flag.name}: ${flag.enabled ? t.flags.enabledLabel : t.flags.disabledLabel}`}
        />
      </TableCell>
      <TableCell className="px-3 py-3 text-sm text-muted-foreground">
        {flag.rolloutPercentage !== null ? `${flag.rolloutPercentage}%` : t.flags.rolloutNotSet}
      </TableCell>
      <TableCell className="px-3 py-3">
        {isDeleting ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive">{t.flags.confirmDelete}</span>
            <Button variant="destructive" size="sm" onClick={() => onDelete(flag.flagId)}>
              {t.flags.confirmDeleteBtn}
            </Button>
            <Button variant="outline" size="sm" onClick={onDeleteCancel}>
              {t.flags.cancelBtn}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {depth === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddSub({ flagId: flag.flagId, name: flag.name, key: flag.key })}
              >
                {t.flags.addSubFlagBtn}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(flag)}>
              {t.flags.editBtn}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDeleteStart(flag.flagId)}>
              {t.flags.deleteBtn}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
});
