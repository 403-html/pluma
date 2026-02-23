'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyPillProps {
  value: string;
  className?: string;
}

type CopyState = 'idle' | 'success' | 'error';

export function CopyPill({ value, className = '' }: CopyPillProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(value);
      setState('success');
    } catch {
      setState('error');
    }

    // Revert to idle after 1500ms for both success and error states
    timeoutRef.current = setTimeout(() => {
      setState('idle');
      timeoutRef.current = null;
    }, 1500);
  };

  const getStateClasses = () => {
    if (state === 'success') {
      return 'text-green-600 dark:text-green-400';
    }
    if (state === 'error') {
      return 'text-red-500';
    }
    return 'text-muted-foreground';
  };

  const Icon = state === 'success' ? Check : state === 'error' ? X : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy value to clipboard"
      className={cn(
        'font-mono text-xs bg-muted px-2 py-0.5 rounded inline-flex items-center gap-1.5 cursor-pointer transition-colors',
        'hover:bg-muted/80',
        getStateClasses(),
        className
      )}
    >
      <span>{value}</span>
      <Icon size={12} />
    </button>
  );
}
