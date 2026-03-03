const ACTOR_TYPE_CLASSES: Record<string, string> = {
  'user': 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
  'system': 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100',
  'sdk-token': 'bg-amber-100 text-amber-800 dark:bg-amber-600 dark:text-amber-50',
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
