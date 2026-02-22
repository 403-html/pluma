'use client';

import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { updateFlag, type FlagEntry } from '@/lib/api/flags';
import { isValidProjectKey } from '@/lib/projectKeyUtils';

export function EditFlagModal({
  flag,
  onClose,
  onSuccess,
  onError,
}: {
  flag: FlagEntry;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(flag.name);
  const [key, setKey] = useState(flag.key);
  const [description, setDescription] = useState(flag.description || '');
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
      setKeyError(t.flags.keyRequired);
      return;
    }
    if (trimmedKey.length > MAX_PROJECT_KEY_LENGTH) {
      setKeyError(t.flags.keyTooLong);
      return;
    }
    if (!isValidProjectKey(trimmedKey)) {
      setKeyError(t.flags.keyInvalid);
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

    const result = await updateFlag(flag.flagId, {
      key,
      name,
      description: description || null,
    });
    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="edit-flag-modal-title" title={t.flags.modalEditTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="flag-name-edit" className="form-label">
            {t.flags.nameLabel}
          </label>
          <input
            id="flag-name-edit"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.flags.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="flag-key-edit" className="form-label">
            {t.flags.keyLabel}
          </label>
          <ProjectKeyField
            id="flag-key-edit"
            value={key}
            isEditing={isKeyEditing}
            error={keyError}
            disabled={isSubmitting}
            placeholder={t.flags.keyPlaceholder}
            editBtnLabel={t.flags.keyEditBtnLabel}
            onEditStart={handleEditKey}
            onChange={handleKeyChange}
            onBlur={handleKeyBlur}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="flag-description-edit" className="form-label">
            {t.flags.descriptionLabel}
          </label>
          <textarea
            id="flag-description-edit"
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.flags.descriptionPlaceholder}
            disabled={isSubmitting}
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.flags.cancelBtn}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {t.flags.saveBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
