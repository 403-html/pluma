'use client';

import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="flag-name-edit" className="text-sm font-medium">
            {t.flags.nameLabel}
          </label>
          <Input
            id="flag-name-edit"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.flags.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="flag-key-edit" className="text-sm font-medium">
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

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="flag-description-edit" className="text-sm font-medium">
            {t.flags.descriptionLabel}
          </label>
          <textarea
            id="flag-description-edit"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.flags.descriptionPlaceholder}
            disabled={isSubmitting}
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="flex gap-3 justify-end mt-5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.flags.cancelBtn}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t.flags.saveBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
