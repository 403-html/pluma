'use client';

export function TagInput({
  value,
  onRemove,
  disabled,
  pending,
}: {
  value: string;
  onRemove: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${pending ? 'bg-destructive/15 text-destructive ring-1 ring-destructive/40' : 'bg-muted text-foreground'}`}>
      {value}
      <button
        type="button"
        aria-label={`Remove ${value}`}
        onClick={onRemove}
        disabled={disabled}
        className="leading-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
      >
        ×
      </button>
    </span>
  );
}
