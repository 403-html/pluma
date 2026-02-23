'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { createProject } from '@/lib/api/projects';
import { slugify, makeKeyUnique, isValidProjectKey } from '@/lib/projectKeyUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name" className="text-sm font-medium">
            {t.projects.nameLabel}
          </label>
          <Input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projects.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="project-key" className="text-sm font-medium">
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

        <div className="flex gap-3 justify-end mt-5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.projects.cancelBtn}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t.projects.createBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
