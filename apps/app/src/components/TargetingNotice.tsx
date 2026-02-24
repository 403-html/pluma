import { Info } from 'lucide-react';

export interface TargetingNoticeProps {
  title: string;
  body: string;
  codeSnippet: string;
}

export function TargetingNotice({ title, body, codeSnippet }: TargetingNoticeProps) {
  return (
    <div className="flex gap-2.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm dark:border-blue-900 dark:bg-blue-950/40">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-blue-900 dark:text-blue-200">{title}</p>
        <p className="text-blue-800/80 dark:text-blue-300/80">{body}</p>
        <code className="block rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-900 dark:bg-blue-900/60 dark:text-blue-200">
          {codeSnippet}
        </code>
      </div>
    </div>
  );
}
