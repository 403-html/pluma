'use client';

import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import Modal from '@/components/Modal';
import { updateProject, type ProjectSummary } from '@/lib/api/projects';

export function EditProjectModal({
  project,
  onClose,
  onSuccess,
  onError,
}: {
  project: ProjectSummary;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateProject(project.id, { key, name });
    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="edit-project-modal-title" title={t.projects.modalEditTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name-edit" className="form-label">
            {t.projects.nameLabel}
          </label>
          <input
            id="project-name-edit"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projects.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="project-key-edit" className="form-label">
            {t.projects.keyLabel}
          </label>
          <input
            id="project-key-edit"
            type="text"
            className="form-input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t.projects.keyPlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.projects.cancelBtn}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {t.projects.saveBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
