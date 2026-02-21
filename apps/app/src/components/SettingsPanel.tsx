'use client';

import { useState } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { changePassword } from '@/lib/api/auth';
import LanguageSwitcher from './LanguageSwitcher';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { t, locale } = useLocale();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    // Clear sensitive data when closing
    setOldPassword('');
    setNewPassword('');
    setMessage(null);
    onClose();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsChangingPassword(true);

    try {
      const result = await changePassword(oldPassword, newPassword, locale);

      if (result.ok) {
        setMessage({ type: 'success', text: t.settings.changePasswordSuccess });
        setOldPassword('');
        setNewPassword('');
      } else {
        setMessage({
          type: 'error',
          text: result.message || t.settings.changePasswordError,
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <>
      <div className="settings-overlay" onClick={handleClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <h2 className="settings-title">{t.settings.title}</h2>
          <button
            type="button"
            className="settings-close-btn"
            onClick={handleClose}
            aria-label={t.settings.close}
          >
            ×
          </button>
        </div>

        <div className="settings-content">
          {/* Language Section */}
          <section className="settings-section">
            <h3 className="settings-section-title">{t.settings.languageSection}</h3>
            <LanguageSwitcher />
          </section>

          {/* Change Password Section */}
          <section className="settings-section">
            <h3 className="settings-section-title">{t.settings.passwordSection}</h3>
            <form className="settings-form" onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="old-password" className="form-label">
                  {t.settings.oldPassword}
                </label>
                <input
                  id="old-password"
                  type="password"
                  className="form-input"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  disabled={isChangingPassword}
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-password" className="form-label">
                  {t.settings.newPassword}
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isChangingPassword}
                />
              </div>

              {message && (
                <div className={message.type === 'success' ? 'form-success' : 'form-error'}>
                  {message.text}
                </div>
              )}

              <button type="submit" className="form-button" disabled={isChangingPassword}>
                {isChangingPassword ? t.settings.changePasswordLoading : t.settings.changePassword}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
