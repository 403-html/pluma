type FlagCreateFormProps = {
  formKey: string;
  formName: string;
  formDesc: string;
  submitting: boolean;
  onFormKey: (v: string) => void;
  onFormName: (v: string) => void;
  onFormDesc: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export default function FlagCreateForm({
  formKey,
  formName,
  formDesc,
  submitting,
  onFormKey,
  onFormName,
  onFormDesc,
  onSubmit,
  onCancel,
}: FlagCreateFormProps) {
  const inputClass =
    'px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]';

  return (
    <form className="mb-4 p-4 bg-card border border-stroke" onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <input type="text" className={inputClass} placeholder="Key (e.g., new-checkout-flow)" value={formKey} onChange={(e) => onFormKey(e.target.value)} required autoFocus />
        <input type="text" className={inputClass} placeholder="Name (e.g., New Checkout Flow)" value={formName} onChange={(e) => onFormName(e.target.value)} required />
        <input type="text" className={inputClass} placeholder="Description (optional)" value={formDesc} onChange={(e) => onFormDesc(e.target.value)} />
        {/* TODO: parent flag selector — re-enable once GET /environments/:envId/flags returns parentFlagId */}
        <div className="col-span-2 flex gap-2 justify-end">
          <button type="submit" className="px-4 py-1.5 bg-accent text-surface font-semibold text-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={submitting}>
            Create
          </button>
          <button type="button" className="px-3 py-1.5 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
