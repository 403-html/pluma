import type { Project } from '@pluma/types';

type ProjectTableProps = {
  projects: Project[];
  editingId: string | null;
  formName: string;
  submitting: boolean;
  onFormName: (v: string) => void;
  onStartEdit: (project: Project) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

export default function ProjectTable({
  projects,
  editingId,
  formName,
  submitting,
  onFormName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: ProjectTableProps) {
  const thClass = 'text-left p-4 text-ink-muted text-xs font-semibold uppercase tracking-wider border-b border-stroke';
  const tdClass = 'p-4 text-ink text-sm border-b border-stroke';
  const btnClass = 'px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

  return (
    <table className="w-full border-collapse bg-card">
      <thead>
        <tr>
          <th className={thClass}>Key</th>
          <th className={thClass}>Name</th>
          <th className={thClass}>Created</th>
          <th className={`${thClass} text-right`}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr key={project.id}>
            <td className={`${tdClass} font-mono`}>{project.key}</td>
            <td className={tdClass}>
              {editingId === project.id ? (
                <input
                  type="text"
                  className="px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                  value={formName}
                  onChange={(e) => onFormName(e.target.value)}
                  autoFocus
                />
              ) : (
                project.name
              )}
            </td>
            <td className={`p-4 text-ink-muted text-sm border-b border-stroke`}>
              {new Date(project.createdAt).toLocaleDateString()}
            </td>
            <td className={`${tdClass} text-right space-x-3`}>
              {editingId === project.id ? (
                <>
                  <button className={`${btnClass} disabled:opacity-50 disabled:cursor-not-allowed`} onClick={() => onSaveEdit(project.id)} disabled={submitting}>Save</button>
                  <button className={btnClass} onClick={onCancelEdit}>Cancel</button>
                </>
              ) : (
                <>
                  <button className={btnClass} onClick={() => onStartEdit(project)}>Edit</button>
                  <button
                    className="px-4 py-2 border border-red-800/50 text-red-300 text-sm hover:bg-red-900/20 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    onClick={() => onDelete(project.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
