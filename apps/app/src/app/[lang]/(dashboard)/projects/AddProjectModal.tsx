'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
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
  const keyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isKeyCustomized && name) {
      setKey(makeKeyUnique(slugify(name), existingKeys));
    } else if (!isKeyCustomized && !name) {
      setKey('');
    }
  }, [name, isKeyCustomized, existingKeys]);

  useEffect(() => {
    if (isKeyEditing && keyInputRef.current) {
      keyInputRef.current.focus();
    }
  }, [isKeyEditing]);

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

          {isKeyEditing ? (
            <div className="project-key-input-wrapper">
              <input
                ref={keyInputRef}
                id="project-key"
                type="text"
                className="form-input"
                value={key}
                onChange={handleKeyChange}
                onBlur={handleKeyBlur}
                disabled={isSubmitting}
              />
              {keyError && <div className="project-key-error">{keyError}</div>}
            </div>
          ) : (
            <div className="project-key-preview">
              {key ? (
                <code className="project-key-preview-text">{key}</code>
              ) : (
                <span className="project-key-preview-text" aria-label="placeholder">
                  {t.projects.keyPlaceholder}
                </span>
              )}
              <button
                type="button"
                className="project-key-edit-btn"
                onClick={handleEditKey}
                disabled={isSubmitting}
                aria-label={t.projects.keyEditBtnLabel}
                title={t.projects.keyEditBtnLabel}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L5.33301 13.3334L1.66634 14.3334L2.66634 10.6667L11.333 2.00004Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}

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
