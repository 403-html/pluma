'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// How long the success/error feedback is shown before reverting to idle
const FEEDBACK_DURATION_MS = 1500;

interface CopyPillProps {
  value: string;
  /** 'pill' (default): small inline pill for table cells.
   *  'inline': transparent, fills parent container, for use inside field wrappers. */
  variant?: 'pill' | 'inline';
  className?: string;
}

type CopyState = 'idle' | 'success' | 'error';

export function CopyPill({ value, variant = 'pill', className = '' }: CopyPillProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDisabled = value.trim() === '';

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (isDisabled) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(value);
      setState('success');
    } catch (err) {
      console.warn('CopyPill: clipboard write failed', err);
      setState('error');
    }

    timeoutRef.current = setTimeout(() => {
      setState('idle');
      timeoutRef.current = null;
    }, FEEDBACK_DURATION_MS);
  };

  const Icon = state === 'success' ? Check : state === 'error' ? X : Copy;
  const iconSize = variant === 'inline' ? 16 : 12;
  const stateClasses =
    state === 'success'
      ? 'text-green-600 dark:text-green-400'
      : state === 'error'
        ? 'text-destructive'
        : variant === 'inline'
          ? 'text-foreground'
          : 'text-muted-foreground';
  const ariaLabel =
    state === 'success'
      ? 'Copied!'
      : state === 'error'
        ? 'Failed to copy'
        : `Copy ${value} to clipboard`;

  const variantClasses =
    variant === 'inline'
      ? 'bg-transparent px-0 py-0 hover:bg-muted/20 text-foreground font-mono text-[0.95rem]'
      : 'bg-muted px-2 py-0.5 hover:bg-muted/80 font-mono text-xs';

  const textSpanClass = variant === 'inline' ? 'truncate min-w-0 flex-1' : undefined;
  const iconClass = variant === 'inline' ? 'shrink-0' : undefined;

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isDisabled}
      aria-label={ariaLabel}
      title={value}
      className={cn(
        'rounded inline-flex items-center gap-1.5 cursor-pointer transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses,
        stateClasses,
        className
      )}
    >
      <span className={textSpanClass}>{value}</span>
      <Icon size={iconSize} aria-hidden="true" className={iconClass} />
    </button>
  );
}
