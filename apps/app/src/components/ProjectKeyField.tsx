'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PencilIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L5.33301 13.3334L1.66634 14.3334L2.66634 10.6667L11.333 2.00004Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }

    // Revert to idle after 1500ms for both success and error states
    copyTimeoutRef.current = setTimeout(() => {
      setCopyState('idle');
      copyTimeoutRef.current = null;
    }, 1500);
  };

  const getCopyButtonClasses = () => {
    if (copyState === 'success') {
      return 'text-green-600 dark:text-green-400';
    }
    if (copyState === 'error') {
      return 'text-red-500';
    }
    return 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
  };

  const CopyIcon = copyState === 'success' ? Check : copyState === 'error' ? X : Copy;

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
          <code className="flex-1 font-mono text-[0.95rem] text-foreground">{value}</code>
        ) : (
          <span className="flex-1 font-mono text-[0.95rem] text-foreground" aria-label="placeholder">
            {placeholder}
          </span>
        )}
        <button
          type="button"
          className={cn(
            'flex items-center justify-center cursor-pointer p-1 transition-colors rounded',
            'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-30',
            getCopyButtonClasses()
          )}
          onClick={handleCopy}
          disabled={disabled || !value}
          aria-label="Copy to clipboard"
          title="Copy to clipboard"
        >
          <CopyIcon size={16} />
        </button>
        <button
          type="button"
          className="flex items-center justify-center cursor-pointer p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={onEditStart}
          disabled={disabled}
          aria-label={editBtnLabel}
          title={editBtnLabel}
        >
          <PencilIcon />
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
