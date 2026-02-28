'use client';

import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { updateProject, type ProjectSummary } from '@/lib/api/projects';
import { isValidProjectKey } from '@/lib/projectKeyUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const [isKeyEditing, setIsKeyEditing] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleEditKey() {
    setIsKeyEditing(true);
    setKeyError(null);
  }

  function handleKeyBlur() {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      setKeyError(t.projects.keyRequired);
      return;
    }
    if (trimmedKey.length > MAX_PROJECT_KEY_LENGTH) {
      setKeyError(t.projects.keyTooLong);
      return;
    }
    if (!isValidProjectKey(trimmedKey)) {
      setKeyError(t.projects.keyInvalid);
      return;
    }

    setKey(trimmedKey);
    setKeyError(null);
    setIsKeyEditing(false);
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKey(e.target.value);
    setKeyError(null);
  }

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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name-edit" className="text-sm font-medium">
            {t.projects.nameLabel}
          </label>
          <Input
            id="project-name-edit"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projects.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="project-key-edit" className="text-sm font-medium">
            {t.projects.keyLabel}
          </label>
          <ProjectKeyField
            id="project-key-edit"
            value={key}
            isEditing={isKeyEditing}
            error={keyError}
            disabled={isSubmitting}
            placeholder={t.projects.keyPlaceholder}
            editBtnLabel={t.projects.keyEditBtnLabel}
            onEditStart={handleEditKey}
            onChange={handleKeyChange}
            onBlur={handleKeyBlur}
          />
        </div>

        <div className="flex gap-3 justify-end mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.projects.cancelBtn}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t.projects.saveBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
