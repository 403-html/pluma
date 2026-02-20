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
  const btnClass = 'px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
  const isEditing = editingId === flag.flagId;

  return (
    <div className={`bg-card p-6 border-l-[3px] ${flag.enabled ? 'border-l-accent' : 'border-l-ink-dim'/* TODO: add ml-8 for child flags once API returns parentFlagId */}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-ink font-mono text-base font-semibold">{flag.key}</h3>
          {/* TODO: show ↳ parent badge once GET /environments/:envId/flags returns parentFlagId */}
          {isEditing ? (
            <div className="mt-3 space-y-2">
              <input type="text" className={inputClass} value={formName} onChange={(e) => onFormName(e.target.value)} placeholder="Name" autoFocus />
              <input type="text" className={inputClass} value={formDesc} onChange={(e) => onFormDesc(e.target.value)} placeholder="Description" />
            </div>
          ) : (
            <>
              <p className="text-ink text-sm mt-2">{flag.name}</p>
              {flag.description && <p className="text-ink-muted text-sm mt-1">{flag.description}</p>}
            </>
          )}
        </div>
        <label className="flex items-center gap-3 ml-6 cursor-pointer">
          <input type="checkbox" checked={flag.enabled} onChange={() => onToggle(flag)} className="sr-only peer" />
          <div className="relative w-12 h-6 bg-stroke peer-checked:bg-accent transition-colors">
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-ink transition-transform peer-checked:translate-x-6" />
          </div>
          <span className="text-ink-muted text-sm select-none">{flag.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
      <div className="flex gap-3">
        {isEditing ? (
          <>
            <button className={`${btnClass} disabled:opacity-50 disabled:cursor-not-allowed`} onClick={() => onSaveEdit(flag.flagId)} disabled={submitting}>Save</button>
            <button className={btnClass} onClick={onCancelEdit}>Cancel</button>
          </>
        ) : (
          <>
            <button className={btnClass} onClick={() => onStartEdit(flag)}>Edit</button>
            <button className="px-4 py-2 border border-red-800/50 text-red-300 text-sm hover:bg-red-900/20 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" onClick={() => onDelete(flag.flagId)}>Delete</button>
            {/* TODO: re-enable "Add sub-flag" once GET /environments/:envId/flags returns parentFlagId */}
          </>
        )}
      </div>
    </div>
  );
}
