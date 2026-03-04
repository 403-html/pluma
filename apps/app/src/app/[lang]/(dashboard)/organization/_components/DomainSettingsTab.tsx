'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLocale } from '@/i18n/LocaleContext';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckboxField } from '@/components/ui/checkbox';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import isValidDomain from 'is-valid-domain';
import { getOrgSettings, patchOrgSettings } from '@/lib/api/orgSettings';

export default function DomainSettingsTab() {
  const { t } = useLocale();
  const labels = t.organization.domainSettings;
  const { currentUser } = useCurrentUser();

  const isReadOnly = currentUser?.role === 'user';

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Domain allowlist state
  const [domains, setDomains] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Email notification state
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await getOrgSettings();
      if (result.ok) {
        setDomains(result.settings.allowedDomains);
        setSendWelcomeEmail(result.settings.sendWelcomeEmail);
        setSmtpFrom(result.settings.smtpFrom);
      } else {
        setLoadError(result.message);
      }
      setIsLoading(false);
    })();
  }, []);

  function validateDomain(value: string): boolean {
    return isValidDomain(value);
  }

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (!validateDomain(trimmed)) {
      setInputError(labels.domainInvalid);
      return;
    }
    if (domains.includes(trimmed)) {
      setInputError(labels.domainDuplicate);
      return;
    }
    setDomains((prev) => [...prev, trimmed]);
    setInputValue('');
    setInputError(null);
  }

  function handleRemove(domain: string) {
    setDomains((prev) => prev.filter((d) => d !== domain));
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await patchOrgSettings({ allowedDomains: domains, smtpFrom, sendWelcomeEmail });
    setIsSaving(false);
    if (result.ok) {
      setDomains(result.settings.allowedDomains);
      setSendWelcomeEmail(result.settings.sendWelcomeEmail);
      setSmtpFrom(result.settings.smtpFrom);
      toast.success(labels.toastSaveSuccess);
    } else {
      toast.error(result.message ?? labels.saveError);
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm text-destructive"
      >
        <AlertCircle size={15} aria-hidden="true" />
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Domain Allowlist ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold">{labels.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{labels.desc}</p>
        </div>

        {domains.length === 0 && (
          <p
            className="rounded-md border border-primary/20 bg-primary/10 px-3 py-3 text-sm text-primary"
            aria-live="polite"
          >
            {labels.emptyState}
          </p>
        )}

        {domains.length > 0 && (
          <ul aria-label={labels.title} className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <li
                key={domain}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-sm"
              >
                <span>{domain}</span>
                <button
                  type="button"
                  aria-label={`${labels.removeBtn} ${domain}`}
                  disabled={isReadOnly || isSaving}
                  onClick={() => handleRemove(domain)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="domain-input" className="text-sm font-medium">
            {labels.addLabel}
          </label>
          <div className="flex gap-2">
            <Input
              id="domain-input"
              type="text"
              placeholder={labels.addPlaceholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              aria-describedby={inputError ? 'domain-input-error' : undefined}
              aria-invalid={inputError ? true : undefined}
              disabled={isReadOnly || isSaving}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAdd}
              disabled={isReadOnly || isSaving}
            >
              {labels.addBtn}
            </Button>
          </div>
          {inputError && (
            <p id="domain-input-error" role="alert" className="text-sm text-destructive">
              {inputError}
            </p>
          )}
        </div>
      </div>

      {/* ── Welcome Email ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{labels.emailSection}</h2>
          <p className="text-sm text-muted-foreground mt-1">{labels.emailSectionDesc}</p>
        </div>

        <CheckboxField
          checked={sendWelcomeEmail}
          onCheckedChange={(checked) => setSendWelcomeEmail(checked)}
          disabled={isReadOnly || isSaving}
          label={labels.sendWelcomeEmailLabel}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="smtp-from-input" className="text-sm font-medium">
            {labels.smtpFromLabel}
          </label>
          <Input
            id="smtp-from-input"
            type="email"
            placeholder={labels.smtpFromPlaceholder}
            value={smtpFrom}
            onChange={(e) => setSmtpFrom(e.target.value)}
            disabled={isReadOnly || isSaving}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">{labels.smtpFromDesc}</p>
        </div>
      </div>

      {/* ── Save ─────────────────────────────────────────────────────── */}
      <div>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isReadOnly || isSaving}
        >
          {isSaving ? labels.saveLoading : labels.saveBtn}
        </Button>
      </div>

    </div>
  );
}
