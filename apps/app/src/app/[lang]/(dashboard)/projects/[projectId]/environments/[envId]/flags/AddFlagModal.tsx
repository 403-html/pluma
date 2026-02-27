'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { createFlag } from '@/lib/api/flags';
import { slugify, makeKeyUnique, isValidProjectKey } from '@/lib/projectKeyUtils';

export function AddFlagModal({
  projectId,
  existingKeys,
  flags,
  onClose,
  onSuccess,
  onError,
}: {
  projectId: string;
  existingKeys: string[];
  flags: Array<{ flagId: string; key: string; name: string; parentFlagId: string | null }>;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [parentFlagId, setParentFlagId] = useState<string>('');
  const [isKeyCustomized, setIsKeyCustomized] = useState(false);
  const [isKeyEditing, setIsKeyEditing] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track initial mount so the effect below does not run on the first render
  // and overwrite any existing key state.
  // Capture the existing keys once at mount time so the auto-generated key
  // only depends on name/isKeyCustomized, not on background updates to
  // existingKeys (which would otherwise regenerate the key unexpectedly).
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
    if (existingKeys.includes(trimmedKey)) {
      setKeyError(t.flags.keyDuplicate);
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
      setKeyError(t.flags.keyInvalid);
      return;
    }
    if (existingKeys.includes(key)) {
      setKeyError(t.flags.keyDuplicate);
      return;
    }

    setIsSubmitting(true);
    const result = await createFlag(projectId, key, name, description || undefined, parentFlagId || undefined);
    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="add-flag-modal-title" title={t.flags.modalAddTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="flag-name" className="text-sm font-medium">
            {t.flags.nameLabel}
          </label>
          <Input
            id="flag-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.flags.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="flag-key" className="text-sm font-medium">
            {t.flags.keyLabel}
          </label>

          <ProjectKeyField
            id="flag-key"
            value={key}
            isEditing={isKeyEditing}
            error={keyError}
            disabled={isSubmitting}
            placeholder={t.flags.keyPlaceholder}
            editBtnLabel={t.flags.keyEditBtnLabel}
            hint={!isKeyCustomized && key ? t.flags.keyAutoHint : undefined}
            onEditStart={handleEditKey}
            onChange={handleKeyChange}
            onBlur={handleKeyBlur}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="flag-description" className="text-sm font-medium">
            {t.flags.descriptionLabel}
          </label>
          <textarea
            id="flag-description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.flags.descriptionPlaceholder}
            disabled={isSubmitting}
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label htmlFor="flag-parent" className="text-sm font-medium">
            {t.flags.parentFlagLabel}
          </label>
          <select
            id="flag-parent"
            value={parentFlagId}
            onChange={(e) => setParentFlagId(e.target.value)}
            disabled={isSubmitting}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t.flags.parentFlagNone}</option>
            {flags.filter((f) => f.parentFlagId === null).map((f) => (
              <option key={f.flagId} value={f.flagId}>
                {f.name} ({f.key})
              </option>
            ))}
          </select>
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
            {t.flags.createBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
