import { Key } from 'lucide-react';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Key size={36} aria-hidden="true" className="opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
