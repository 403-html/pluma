'use client';

import { useState, useMemo } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectKeyField } from '@/components/ProjectKeyField';
import { SwitchField } from '@/components/ui/switch';
import { TargetingInput } from '@/components/TargetingInput';
import { TargetingNotice } from '@/components/TargetingNotice';
import { updateFlag, updateFlagConfig, type FlagEntry } from '@/lib/api/flags';
import { isValidProjectKey } from '@/lib/projectKeyUtils';

// ─── Edit Flag Modal ───────────────────────────────────────────────────────────

export function EditFlagModal({
  flag,
  envId,
  onClose,
  onSuccess,
  onError,
}: {
  flag: FlagEntry;
  envId: string;
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

  // Targeting state
  const [allowList, setAllowList] = useState<string[]>(flag.allowList);
  const [denyList, setDenyList] = useState<string[]>(flag.denyList);

  // Rollout state
  const [rolloutEnabled, setRolloutEnabled] = useState(flag.rolloutPercentage !== null);
  const [rolloutValue, setRolloutValue] = useState<string>(
    flag.rolloutPercentage !== null ? String(flag.rolloutPercentage) : ''
  );
  const [rolloutError, setRolloutError] = useState<string | null>(null);

  // Conflict validation: check if any id exists in both lists
  const hasConflict = allowList.some((id) => denyList.includes(id));

  // Union of both lists as the suggestions pool
  const suggestionPool = useMemo(
    () => [...new Set([...allowList, ...denyList])],
    [allowList, denyList],
  );

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

  function arrayContentsEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    return a.every((v) => setB.has(v));
  }

  function validateRollout(value: string): boolean {
    if (value === '') return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 && num <= 100;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasConflict) return;

    // Validate rollout before submitting
    if (rolloutEnabled && !validateRollout(rolloutValue)) {
      setRolloutError(t.flags.rolloutInputError);
      return;
    }

    setIsSubmitting(true);

    const metaResult = await updateFlag(flag.flagId, {
      key,
      name,
      description: description || null,
    });

    if (!metaResult.ok) {
      onError(metaResult.message);
      setIsSubmitting(false);
      return;
    }

    const allowChanged = !arrayContentsEqual(allowList, flag.allowList);
    const denyChanged = !arrayContentsEqual(denyList, flag.denyList);
    const newRollout = rolloutEnabled ? Number(rolloutValue) : null;
    const rolloutChanged = newRollout !== flag.rolloutPercentage;

    if (allowChanged || denyChanged || rolloutChanged) {
      const configPayload: { allowList?: string[]; denyList?: string[]; rolloutPercentage?: number | null } = {};
      if (allowChanged) configPayload.allowList = allowList;
      if (denyChanged) configPayload.denyList = denyList;
      if (rolloutChanged) configPayload.rolloutPercentage = newRollout;

      const configResult = await updateFlagConfig(envId, flag.flagId, configPayload);
      if (!configResult.ok) {
        onError(configResult.message);
        setIsSubmitting(false);
        return;
      }
    }

    onSuccess();
  }

  const submitDisabled = isSubmitting || hasConflict || (rolloutEnabled && !validateRollout(rolloutValue));

  return (
    <Modal titleId="edit-flag-modal-title" title={t.flags.modalEditTitle} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-x-6 items-start">
          {/* ── Left column: flag metadata ──────────────────────────── */}
          <div className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-1.5">
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

            <div className="flex flex-col gap-1.5">
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
          </div>

          {/* ── Right column: targeting ──────────────────────────────── */}
          <div className="flex flex-col border-l border-border/40 pl-6">
            <h3 className="text-sm font-semibold mb-3">{t.flags.targetingTitle}</h3>

            <TargetingNotice
              title={t.flags.targetingNoticeTitle}
              body={t.flags.targetingNoticeBody}
              codeSnippet={t.flags.targetingNoticeCode}
              dismissLabel={t.flags.targetingNoticeDismiss}
            />

            <div className="flex flex-col gap-1.5 mt-4">
              <label htmlFor="flag-allow-list" className="text-sm font-medium">
                {t.flags.allowListLabel}
              </label>
              <TargetingInput
                id="flag-allow-list"
                tags={allowList}
                suggestions={suggestionPool}
                onAdd={(v) => setAllowList((prev) => [...prev, v])}
                onRemove={(v) => setAllowList((prev) => prev.filter((x) => x !== v))}
                placeholder={t.flags.targetingSearchPlaceholder}
                disabled={isSubmitting}
                disabledValues={denyList}
                addOptionLabel={t.flags.targetingAddOption}
                disabledValueHint={t.flags.targetingDisabledValueHint}
                errorId={hasConflict ? 'flag-targeting-conflict-error' : undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5 mt-4">
              <label htmlFor="flag-deny-list" className="text-sm font-medium">
                {t.flags.denyListLabel}
              </label>
              <TargetingInput
                id="flag-deny-list"
                tags={denyList}
                suggestions={suggestionPool}
                onAdd={(v) => setDenyList((prev) => [...prev, v])}
                onRemove={(v) => setDenyList((prev) => prev.filter((x) => x !== v))}
                placeholder={t.flags.targetingSearchPlaceholder}
                disabled={isSubmitting}
                disabledValues={allowList}
                addOptionLabel={t.flags.targetingAddOption}
                disabledValueHint={t.flags.targetingDisabledValueHint}
                errorId={hasConflict ? 'flag-targeting-conflict-error' : undefined}
              />
            </div>

            {/* ── Rollout percentage ──────────────────────────────── */}
            <div className="flex flex-col gap-2 mt-4">
              <h3 className="text-sm font-semibold">{t.flags.rolloutLabel}</h3>
              <SwitchField
                id="flag-rollout-enabled"
                checked={rolloutEnabled}
                onCheckedChange={(checked) => {
                  setRolloutEnabled(checked);
                  setRolloutError(null);
                  if (!checked) setRolloutValue('');
                }}
                disabled={isSubmitting}
                label={t.flags.rolloutCheckboxLabel}
              />
              {rolloutEnabled && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="flag-rollout-value" className="text-xs text-muted-foreground">
                    {t.flags.rolloutInputLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="flag-rollout-value"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={rolloutValue}
                      onChange={(e) => {
                        setRolloutValue(e.target.value);
                        setRolloutError(null);
                      }}
                      placeholder={t.flags.rolloutInputPlaceholder}
                      disabled={isSubmitting}
                      className="w-24"
                      aria-label={t.flags.rolloutInputAriaLabel}
                      aria-describedby="rollout-hint rollout-error"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p id="rollout-hint" className="text-xs text-muted-foreground">{t.flags.rolloutHint}</p>
                  {rolloutError && (
                    <p id="rollout-error" role="alert" className="text-xs text-destructive">{rolloutError}</p>
                  )}
                </div>
              )}
            </div>

            {hasConflict && (
              <p id="flag-targeting-conflict-error" role="alert" className="mt-2 text-xs text-destructive">
                {t.flags.targetingConflictError}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-border/40">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.flags.cancelBtn}
          </Button>
          <Button type="submit" disabled={submitDisabled}>
            {t.flags.saveBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
