'use client';

import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';

const DISMISSED_KEY = 'pluma:targeting-notice-dismissed';

export interface TargetingNoticeProps {
  title: string;
  body: string;
  codeSnippet: string;
  dismissLabel: string;
}

export function TargetingNotice({ title, body, codeSnippet, dismissLabel }: TargetingNoticeProps) {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISSED_KEY) !== 'true');
    } catch {
      setVisible(true);
    }
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // storage unavailable; dismiss for this session only
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex gap-2.5 rounded-md border border-blue-300 bg-blue-100 px-3 py-2.5 text-sm dark:border-blue-900 dark:bg-blue-950/40">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-blue-950 dark:text-blue-200">{title}</p>
        <p className="text-blue-900 dark:text-blue-300">{body}</p>
        <code className="block rounded bg-blue-200 px-2 py-0.5 font-mono text-xs text-blue-950 dark:bg-blue-900/60 dark:text-blue-200">
          {codeSnippet}
        </code>
      </div>
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={handleDismiss}
        className="shrink-0 self-start text-blue-500 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-300"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
