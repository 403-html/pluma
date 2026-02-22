'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { createProject } from '@/lib/api/projects';
import { slugify, makeKeyUnique, isValidProjectKey } from '@/lib/projectKeyUtils';

export function AddProjectModal({
  existingKeys,
  onClose,
  onSuccess,
  onError,
}: {
  existingKeys: string[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [isKeyCustomized, setIsKeyCustomized] = useState(false);
  const [isKeyEditing, setIsKeyEditing] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isKeyCustomized && name) {
      setKey(makeKeyUnique(slugify(name), existingKeys));
    } else if (!isKeyCustomized && !name) {
      setKey('');
    }
  }, [name, isKeyCustomized, existingKeys]);

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
    setIsKeyCustomized(true);
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKey(e.target.value.trim());
    setKeyError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isValidProjectKey(key)) {
      setKeyError(t.projects.keyInvalid);
      return;
    }
    if (existingKeys.includes(key)) {
      setKeyError(t.projects.keyDuplicate);
      return;
    }

    setIsSubmitting(true);
    const result = await createProject(key, name);
    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="add-project-modal-title" title={t.projects.modalAddTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name" className="form-label">
            {t.projects.nameLabel}
          </label>
          <input
            id="project-name"
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
          <label htmlFor="project-key" className="form-label">
            {t.projects.keyLabel}
          </label>

          <ProjectKeyField
            id="project-key"
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

          {!isKeyEditing && !isKeyCustomized && key && (
            <p className="form-helper-text">{t.projects.keyAutoHint}</p>
          )}
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
            {t.projects.createBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
