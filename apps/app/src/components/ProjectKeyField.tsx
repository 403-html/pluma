'use client';

import { useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { CopyPill } from '@/components/CopyPill';

/**
 * Displays a project key as a read-only code block with a hover-revealed
 * pencil button to enter edit mode. The parent owns all state.
 */
export function ProjectKeyField({
  id,
  value,
  isEditing,
  error,
  disabled,
  placeholder,
  editBtnLabel,
  hint,
  onEditStart,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  isEditing: boolean;
  error: string | null;
  disabled: boolean;
  placeholder: string;
  editBtnLabel: string;
  hint?: string;
  onEditStart: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    const errorId = error ? `${id}-error` : undefined;
    const hintId = hint ? `${id}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
    return (
      <>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            id={id}
            type="text"
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={!!error}
          />
          {error && (
            <div id={`${id}-error`} className="text-sm text-destructive mt-1" role="alert">
              {error}
            </div>
          )}
        </div>
        {hint && !error && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground mt-1">
            {hint}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center relative gap-2 px-3 py-2.5 bg-muted/30 border border-border rounded-md font-mono text-[0.95rem] min-h-[3rem] group">
        {value ? (
          <CopyPill
            value={value}
            className="flex-1 text-[0.95rem] bg-transparent px-0 py-0 hover:bg-transparent text-foreground"
          />
        ) : (
          <span className="flex-1 font-mono text-[0.95rem] text-foreground" aria-label="placeholder">
            {placeholder}
          </span>
        )}
        <button
          type="button"
          className="flex items-center justify-center cursor-pointer p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={onEditStart}
          disabled={disabled}
          aria-label={editBtnLabel}
          title={editBtnLabel}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground mt-1">
          {hint}
        </p>
      )}
    </>
  );
}
