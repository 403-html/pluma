'use client';

import { useState, useEffect, useRef } from 'react';
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
  // Track initial mount so that subsequent existingKeys changes (background refreshes)
  // don't unexpectedly regenerate a key the user is already editing.
  const hasMountedRef = useRef(false);
  // Capture existingKeys at mount time so the effect only re-runs on name / isKeyCustomized
  // changes, not on background project-list refreshes. Refs are intentionally excluded from
  // the exhaustive-deps rule, so no lint suppression is needed.
  const initialExistingKeysRef = useRef(existingKeys);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!isKeyCustomized) {
      setKey(name ? makeKeyUnique(slugify(name), initialExistingKeysRef.current) : '');
      setKeyError(null);
      setIsKeyEditing(false);
    }
  }, [name, isKeyCustomized]);

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
    if (existingKeys.includes(trimmedKey)) {
      setKeyError(t.projects.keyDuplicate);
      return;
    }

    setKey(trimmedKey);
    setKeyError(null);
    setIsKeyEditing(false);
    setIsKeyCustomized(true);
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKey(e.target.value);
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
            hint={!isKeyCustomized && key ? t.projects.keyAutoHint : undefined}
            onEditStart={handleEditKey}
            onChange={handleKeyChange}
            onBlur={handleKeyBlur}
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
            {t.projects.createBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
