const ACTOR_TYPE_CLASSES: Record<string, string> = {
  'user': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'system': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'sdk-token': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

interface AuditActorTypeBadgeProps {
  actorType: string | null | undefined;
}

export function AuditActorTypeBadge({ actorType }: AuditActorTypeBadgeProps) {
  if (!actorType) return null;
  const cls = ACTOR_TYPE_CLASSES[actorType] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {actorType}
    </span>
  );
}
