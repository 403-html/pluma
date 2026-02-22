'use client';

import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { updateEnvironment, type EnvironmentSummary } from '@/lib/api/environments';
import { isValidProjectKey } from '@/lib/projectKeyUtils';

export function EditEnvironmentModal({
  env,
  onClose,
  onSuccess,
  onError,
}: {
  env: EnvironmentSummary;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(env.name);
  const [key, setKey] = useState(env.key);
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
      setKeyError(t.environments.keyRequired);
      return;
    }
    if (trimmedKey.length > MAX_PROJECT_KEY_LENGTH) {
      setKeyError(t.environments.keyTooLong);
      return;
    }
    if (!isValidProjectKey(trimmedKey)) {
      setKeyError(t.environments.keyInvalid);
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

    const result = await updateEnvironment(env.id, { key, name });
    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="edit-environment-modal-title" title={t.environments.modalEditTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="environment-name-edit" className="form-label">
            {t.environments.nameLabel}
          </label>
          <input
            id="environment-name-edit"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.environments.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="environment-key-edit" className="form-label">
            {t.environments.keyLabel}
          </label>
          <ProjectKeyField
            id="environment-key-edit"
            value={key}
            isEditing={isKeyEditing}
            error={keyError}
            disabled={isSubmitting}
            placeholder={t.environments.keyPlaceholder}
            editBtnLabel={t.environments.keyEditBtnLabel}
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
            {t.environments.cancelBtn}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {t.environments.saveBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
