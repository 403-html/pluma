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
    <div className="flex gap-2.5 rounded-md border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium text-primary">{title}</p>
        <p className="text-primary/80">{body}</p>
        <code className="block rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary overflow-x-auto">
          {codeSnippet}
        </code>
      </div>
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={handleDismiss}
        className="shrink-0 self-start text-primary/60 hover:text-primary"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
