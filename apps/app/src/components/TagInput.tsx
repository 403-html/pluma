'use client';

export function TagInput({
  value,
  onRemove,
  disabled,
}: {
  value: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
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
