import { CopyPill } from '@/components/CopyPill';

export interface RevealToken {
  id: string;
  name: string;
  token: string;
}

interface TokenRevealBannerProps {
  token: RevealToken;
  projectName: string;
  onDismiss: () => void;
  dismissLabel: string;
  title: string;
  desc: string;
  /** Localised label for the key line, e.g. "Key {name} for {project}". */
  keyLabel: string;
}

export default function TokenRevealBanner({
  token,
  projectName,
  onDismiss,
  dismissLabel,
  title,
  desc,
  keyLabel,
}: TokenRevealBannerProps) {
  const formattedKeyLabel = keyLabel
    .replace('{name}', token.name)
    .replace('{project}', projectName);

  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-border border-l-4 border-l-primary bg-card dark:border-emerald-700 dark:border-l-emerald-500 dark:bg-emerald-950/40 p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground dark:text-emerald-300 mb-1">{title}</p>
          <p className="text-xs text-muted-foreground dark:text-emerald-400 mb-2">{desc}</p>
          <p className="text-xs font-medium text-muted-foreground dark:text-emerald-400 mb-2">
            {formattedKeyLabel}
          </p>
          <div className="flex items-center gap-2 rounded-md border border-border dark:border-emerald-800 bg-muted dark:bg-emerald-950/60 px-3 py-2">
            <CopyPill value={token.token} variant="inline" />
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs text-primary dark:text-emerald-400 underline hover:no-underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={dismissLabel}
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
