'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// How long the success/error feedback is shown before reverting to idle
const FEEDBACK_DURATION_MS = 1500;

interface CopyPillProps {
  value: string;
  className?: string;
}

type CopyState = 'idle' | 'success' | 'error';

export function CopyPill({ value, className = '' }: CopyPillProps) {
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
    } catch {
      setState('error');
    }

    timeoutRef.current = setTimeout(() => {
      setState('idle');
      timeoutRef.current = null;
    }, FEEDBACK_DURATION_MS);
  };

  const Icon = state === 'success' ? Check : state === 'error' ? X : Copy;
  const stateClasses =
    state === 'success'
      ? 'text-green-600 dark:text-green-400'
      : state === 'error'
        ? 'text-destructive'
        : 'text-muted-foreground';
  const ariaLabel =
    state === 'success'
      ? 'Copied!'
      : state === 'error'
        ? 'Failed to copy'
        : `Copy ${value} to clipboard`;

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isDisabled}
      aria-label={ariaLabel}
      title={value}
      className={cn(
        'font-mono text-xs bg-muted px-2 py-0.5 rounded inline-flex items-center gap-1.5 cursor-pointer transition-colors',
        'hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50',
        stateClasses,
        className
      )}
    >
      <span>{value}</span>
      <Icon size={12} aria-hidden="true" />
    </button>
  );
}
