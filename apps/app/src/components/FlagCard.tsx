import type { FlagListItem } from '@pluma/types';

type FlagCardProps = {
  flag: FlagListItem;
  editingId: string | null;
  formName: string;
  formDesc: string;
  submitting: boolean;
  onFormName: (v: string) => void;
  onFormDesc: (v: string) => void;
  onStartEdit: (flag: FlagListItem) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onToggle: (flag: FlagListItem) => void;
};

export default function FlagCard({
  flag,
  editingId,
  formName,
  formDesc,
  submitting,
  onFormName,
  onFormDesc,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggle,
}: FlagCardProps) {
  const inputClass = 'w-full px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]';
  const btnClass = 'px-3 py-1 bg-card border border-stroke text-ink text-xs hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
  const isEditing = editingId === flag.flagId;

  return (
    <div className={`bg-card p-4 border-l-2 ${flag.enabled ? 'border-l-accent' : 'border-l-ink-dim'/* TODO: add ml-8 for child flags once API returns parentFlagId */}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-ink font-mono text-sm font-semibold">{flag.key}</h3>
          {/* TODO: show ↳ parent badge once GET /environments/:envId/flags returns parentFlagId */}
          {isEditing ? (
            <div className="mt-2 space-y-1.5">
              <input type="text" className={inputClass} value={formName} onChange={(e) => onFormName(e.target.value)} placeholder="Name" autoFocus />
              <input type="text" className={inputClass} value={formDesc} onChange={(e) => onFormDesc(e.target.value)} placeholder="Description" />
            </div>
          ) : (
            <>
              <p className="text-ink text-sm mt-1">{flag.name}</p>
              {flag.description && <p className="text-ink-muted text-xs mt-0.5">{flag.description}</p>}
            </>
          )}
        </div>
        <label className="flex items-center gap-2 ml-4 cursor-pointer shrink-0">
          <input type="checkbox" checked={flag.enabled} onChange={() => onToggle(flag)} className="sr-only peer" />
          <div className="relative w-9 h-5 bg-stroke peer-checked:bg-accent transition-colors">
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-ink transition-transform peer-checked:translate-x-4" />
          </div>
          <span className={`text-xs select-none ${flag.enabled ? 'text-accent' : 'text-ink-dim'}`}>{flag.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <button className={`${btnClass} disabled:opacity-50 disabled:cursor-not-allowed`} onClick={() => onSaveEdit(flag.flagId)} disabled={submitting}>Save</button>
            <button className={btnClass} onClick={onCancelEdit}>Cancel</button>
          </>
        ) : (
          <>
            <button className={btnClass} onClick={() => onStartEdit(flag)}>Edit</button>
            <button className="px-3 py-1 border border-red-800/50 text-red-300 text-xs hover:bg-red-900/20 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" onClick={() => onDelete(flag.flagId)}>Delete</button>
            {/* TODO: re-enable "Add sub-flag" once GET /environments/:envId/flags returns parentFlagId */}
          </>
        )}
      </div>
    </div>
  );
}
