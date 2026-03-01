'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { createEnvironment } from '@/lib/api/environments';
import { slugify, makeKeyUnique, isValidProjectKey } from '@/lib/projectKeyUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AddEnvironmentModal({
  projectId,
  existingKeys,
  onClose,
  onSuccess,
  onError,
}: {
  projectId: string;
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
  const hasMountedRef = useRef(false);
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
    if (existingKeys.includes(trimmedKey)) {
      setKeyError(t.environments.keyDuplicate);
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
      setKeyError(t.environments.keyInvalid);
      return;
    }
    if (existingKeys.includes(key)) {
      setKeyError(t.environments.keyDuplicate);
      return;
    }

    setIsSubmitting(true);
    const result = await createEnvironment(projectId, key, name);
    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="add-environment-modal-title" title={t.environments.modalAddTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="environment-name" className="text-sm font-medium">
            {t.environments.nameLabel}
          </label>
          <Input
            id="environment-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.environments.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="environment-key" className="text-sm font-medium">
            {t.environments.keyLabel}
          </label>

          <ProjectKeyField
            id="environment-key"
            value={key}
            isEditing={isKeyEditing}
            error={keyError}
            disabled={isSubmitting}
            placeholder={t.environments.keyPlaceholder}
            editBtnLabel={t.environments.keyEditBtnLabel}
            hint={!isKeyCustomized && key ? t.environments.keyAutoHint : undefined}
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
            {t.environments.cancelBtn}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t.environments.createBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
