'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { toastErrorRender } from '@/lib/toastUtils';
import { useLocale } from '@/i18n/LocaleContext';
import { changePassword } from '@/lib/api/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsChangingPassword(true);

    const toastPromise = changePassword(oldPassword, newPassword, locale).then((result) => {
      if (!result.ok) throw new Error(result.message ?? t.settings.changePasswordError);
    });

    try {
      await toast.promise(toastPromise, {
        pending: t.settings.toastPasswordPending,
        success: t.settings.changePasswordSuccess,
        error: { render: toastErrorRender },
      });
      setOldPassword('');
      setNewPassword('');
    } catch {
      // error already shown via toast.promise — no additional handling needed
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <main className="p-4 md:p-8">
      <PageHeader title={t.settings.title} />

      <section className="mb-8 flex flex-col gap-4 last:mb-0">
        <h2 className="text-lg font-semibold mb-4">{t.settings.generalSection}</h2>
        <LanguageSwitcher />
        <ThemeToggle />
      </section>

      <section className="mb-8 flex flex-col gap-4 last:mb-0">
        <h2 className="text-lg font-semibold mb-4">{t.settings.passwordSection}</h2>
        <form className="flex flex-col gap-4 max-w-sm" onSubmit={handleChangePassword}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="old-password" className="text-sm font-medium">
              {t.settings.oldPassword}
            </label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={isChangingPassword}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-password" className="text-sm font-medium">
              {t.settings.newPassword}
            </label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isChangingPassword}
            />
          </div>

          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? t.settings.changePasswordLoading : t.settings.changePassword}
          </Button>
        </form>
      </section>
    </main>
  );
}
