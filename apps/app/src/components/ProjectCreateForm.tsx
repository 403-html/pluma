type ProjectCreateFormProps = {
  formKey: string;
  formName: string;
  submitting: boolean;
  onFormKey: (v: string) => void;
  onFormName: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export default function ProjectCreateForm({
  formKey,
  formName,
  submitting,
  onFormKey,
  onFormName,
  onSubmit,
  onCancel,
}: ProjectCreateFormProps) {
  return (
    <form className="mb-4 p-4 bg-card border border-stroke" onSubmit={onSubmit}>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
          placeholder="Key (e.g., my-app)"
          value={formKey}
          onChange={(e) => onFormKey(e.target.value)}
          required
          autoFocus
        />
        <input
          type="text"
          className="flex-1 px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
          placeholder="Name (e.g., My App)"
          value={formName}
          onChange={(e) => onFormName(e.target.value)}
          required
        />
        <button
          type="submit"
          className="px-4 py-1.5 bg-accent text-surface font-semibold text-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={submitting}
        >
          Create
        </button>
        <button
          type="button"
          className="px-3 py-1.5 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
