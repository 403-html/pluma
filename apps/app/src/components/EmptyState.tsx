import { type LucideIcon, Key } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
}

export default function EmptyState({ message, icon: Icon = Key }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Icon size={36} aria-hidden="true" className="opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
