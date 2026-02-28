import type { AuditAction } from '@pluma/types';

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

interface AuditActionBadgeProps {
  action: AuditAction;
}

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getActionBadgeClass(action)}`}
    >
      {action}
    </span>
  );
}
